import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import { cosineSimilarity } from '@/lib/similarity';

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    type: process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_TYPE,
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
  },
});

interface RawVectorData {
    id: string;
    embedding: number[];
    descriptionText: string;
    nftMetadata: { name?: string; imageUrl?: string } | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(requestedLimit, 5000); // SET THIS FOR NOW TO ENSURE VERCEL DOESNT CRY
    
    // --- FIX IS HERE ---
    // Removed the extraneous `, 10` from the end of the line.
    const threshold = parseFloat(searchParams.get('threshold') || '0.7');
    // --- END FIX ---

    console.log(`API: Fetching ${limit} vectors with threshold ${threshold}...`);

    const query = `
      SELECT 
        v.id, v.embedding, v.descriptionText, a.nftMetadata
      FROM \`storygraph-462415.storygraph.vector_embeddings_external\` v
      LEFT JOIN \`storygraph-462415.storygraph.assets_external\` a ON v.id = a.id
      LIMIT @limit
    `;

    const options = {
      query: query,
      params: { limit: limit },
    };
    const [rows] = await bigquery.query(options);

    const rawData = rows as RawVectorData[];
    
    const nodes = rawData.map(row => ({
      id: row.id,
      label: row.nftMetadata?.name || String(row.id || 'Unknown'),
      description: row.descriptionText,
      imageUrl: row.nftMetadata?.imageUrl || null,
    }));

    const links = [];
    const maxLinks = 7500;
    for (let i = 0; i < rawData.length; i++) {
      if (links.length >= maxLinks) break;
      for (let j = i + 1; j < rawData.length; j++) {
        if (links.length >= maxLinks) break;
        
        const similarity = cosineSimilarity(rawData[i].embedding, rawData[j].embedding);
        
        if (similarity > threshold) {
          links.push({
            source: rawData[i].id,
            target: rawData[j].id,
            similarity,
          });
        }
      }
    }

    console.log(`API: Processed into ${nodes.length} nodes and ${links.length} links.`);
    
    return NextResponse.json({ nodes, links });

  } catch (error) {
    console.error("API Error fetching/processing graph data:", error);
    return NextResponse.json(
        { message: "Error processing graph data", error: (error as Error).message },
        { status: 500 }
    );
  }
}

export const maxDuration = 60;