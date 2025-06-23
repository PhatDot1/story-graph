import { NextRequest, NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

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
})

// Cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
  return dotProduct / (magnitudeA * magnitudeB)
}

// Text embedding using BLIP service
async function getTextEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${process.env.BLIP_EMBEDDING_SERVICE_URL}/embed/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data.embedding
  } catch (error) {
    console.error('Error getting text embedding:', error)
    throw new Error('Failed to generate text embedding')
  }
}

// Image embedding using BLIP service
async function getImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  try {
    const formData = new FormData()
    formData.append('file', new Blob([imageBuffer]))
    
    const response = await fetch(`${process.env.BLIP_EMBEDDING_SERVICE_URL}/embed/image`, {
      method: 'POST',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return data.embedding
  } catch (error) {
    console.error('Error getting image embedding:', error)
    throw new Error('Failed to generate image embedding')
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    let queryEmbedding: number[]
    let limit = 20
    
    if (contentType.includes('multipart/form-data')) {
      // Handle image search
      const formData = await request.formData()
      const imageFile = formData.get('image') as File
      const limitParam = formData.get('limit') as string
      
      if (limitParam) limit = parseInt(limitParam)
      
      if (!imageFile) {
        return NextResponse.json({ error: 'No image provided' }, { status: 400 })
      }
      
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer())
      queryEmbedding = await getImageEmbedding(imageBuffer)
      
    } else {
      // Handle text search
      const body = await request.json()
      const { query, limit: bodyLimit } = body
      
      if (bodyLimit) limit = bodyLimit
      
      if (!query) {
        return NextResponse.json({ error: 'No query provided' }, { status: 400 })
      }
      
      queryEmbedding = await getTextEmbedding(query)
    }
    
    // Fetch all embeddings from BigQuery
    const embeddingsQuery = `
      SELECT 
        v.id,
        v.embedding,
        v.descriptionText,
        a.nftMetadata
      FROM \`storygraph-462415.storygraph.vector_embeddings_external\` v
      LEFT JOIN \`storygraph-462415.storygraph.assets_external\` a
      ON v.id = a.id
      WHERE v.embedding IS NOT NULL
    `
    
    const [rows] = await bigquery.query({ query: embeddingsQuery })
    
    // Calculate similarities
    const results = rows
      .map((row: any) => {
        const similarity = cosineSimilarity(queryEmbedding, row.embedding)
        return {
          id: row.id,
          label: row.nftMetadata?.name || row.id,
          imageUrl: row.nftMetadata?.imageUrl || null,
          description: row.descriptionText,
          similarity
        }
      })
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit)
    
    return NextResponse.json({ results })
    
  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}