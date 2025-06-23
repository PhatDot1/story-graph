import { SemanticVisualization } from "@/components/semantic-visualization"
import { BigQuery } from '@google-cloud/bigquery'

// Initialize BigQuery client using environment variables
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
  try {
    console.log('Fetching data from BigQuery...')
    
    // OPTIMIZED: Single query with JOIN to only get needed asset metadata
    const optimizedQuery = `
      SELECT 
        v.*,
        a.nftMetadata
      FROM \`storygraph-462415.storygraph.vector_embeddings_external\` v
      LEFT JOIN \`storygraph-462415.storygraph.assets_external\` a
      ON v.id = a.id
      LIMIT 2000
    `

    const [result] = await bigquery.query({ query: optimizedQuery })
    
    console.log(`Fetched ${result.length} enriched vectors`)

    // Process the joined data
    return result.map((row) => {
      const meta = row.nftMetadata
      return {
        ...row,
        label: meta?.name || String(row.id || 'Unknown'),
        imageUrl: meta?.imageUrl || null,
      }
    })
  } catch (error) {
    console.error("Error fetching data from BigQuery:", error)
    return []
  }
}

export default async function SemanticViewPage() {
  const data = await fetchEnrichedVectors()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Semantic View</h1>
        <p className="text-muted-foreground mt-2">
          Explore IP assets based on their semantic similarity using vector embeddings. Assets with similar content are
          positioned closer together in this interactive visualization.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
        <p className="text-sm text-blue-800">
          Each IP asset is represented by a high-dimensional vector embedding that captures its semantic meaning. We
          calculate cosine similarity between these vectors to determine how related different assets are, then use a
          force-directed graph to visualize these relationships spatially.
        </p>
      </div>

      <SemanticVisualization data={data} />
    </div>
  )
}