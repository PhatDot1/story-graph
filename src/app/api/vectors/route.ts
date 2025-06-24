import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

// Initialize BigQuery client using environment variables
// This logic is now on the serverless API route, not the page
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
})

async function fetchEnrichedVectors() {
  const optimizedQuery = `
      SELECT 
        v.id,
        v.embedding,
        v.descriptionText,
        a.nftMetadata
      FROM \`storygraph-462415.storygraph.vector_embeddings_external\` v
      LEFT JOIN \`storygraph-462415.storygraph.assets_external\` a
      ON v.id = a.id
      LIMIT 2000
    `

  const [result] = await bigquery.query({ query: optimizedQuery })

  // Process the joined data to create the final shape
  return result.map((row) => {
    const meta = row.nftMetadata
    return {
      id: row.id,
      embedding: row.embedding,
      descriptionText: row.descriptionText,
      label: meta?.name || String(row.id || 'Unknown'),
      imageUrl: meta?.imageUrl || null,
    }
  })
}

// This is the actual API endpoint handler
export async function GET() {
  try {
    console.log('API route: Fetching data from BigQuery...')
    const data = await fetchEnrichedVectors()
    console.log(`API route: Fetched ${data.length} enriched vectors.`)
    return NextResponse.json(data)
  } catch (error) {
    console.error("API Error fetching data from BigQuery:", error)
    // Ensure we send a proper error response
    return NextResponse.json(
        { message: "Error fetching data from BigQuery", error: (error as Error).message },
        { status: 500 }
    );
  }
}