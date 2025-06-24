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

// Helper function to query Hugging Face Inference API with retries
async function queryHuggingFace(url: string, data: any, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const isBuffer = data instanceof Buffer
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": isBuffer ? "application/octet-stream" : "application/json",
        },
        method: "POST",
        body: isBuffer ? data : JSON.stringify(data),
      })
      
      if (response.status === 503) {
        // Model is loading, wait and retry
        const result = await response.json()
        if (result.estimated_time) {
          console.log(`Model loading, waiting ${result.estimated_time}s...`)
          await new Promise(resolve => setTimeout(resolve, Math.min(result.estimated_time * 1000, 20000)))
          continue
        }
      }
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`HF API Error ${response.status}: ${errorText}`)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error)
      if (i === retries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))) // Exponential backoff
    }
  }
}

// Get image caption using BLIP
async function getImageCaption(imageBuffer: Buffer): Promise<string> {
  try {
    console.log('Getting image caption with BLIP...')
    const captionResult = await queryHuggingFace(
      "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base",
      imageBuffer
    )
    
    let caption = ""
    if (Array.isArray(captionResult) && captionResult[0]?.generated_text) {
      caption = captionResult[0].generated_text
    } else if (typeof captionResult === 'string') {
      caption = captionResult
    } else if (captionResult?.generated_text) {
      caption = captionResult.generated_text
    } else {
      throw new Error('Unexpected caption format: ' + JSON.stringify(captionResult))
    }
    
    console.log('Generated caption:', caption)
    return caption
  } catch (error) {
    console.error('Error getting image caption:', error)
    throw new Error('Failed to generate image caption')
  }
}

// Get similarity scores using sentence-similarity pipeline
async function getSimilarityScores(sourceText: string, targetTexts: string[]): Promise<number[]> {
  try {
    const result = await queryHuggingFace(
      "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
      {
        inputs: {
          source_sentence: sourceText,
          sentences: targetTexts
        }
      }
    )
    
    // Result should be an array of similarity scores
    if (Array.isArray(result)) {
      return result
    }
    
    throw new Error('Unexpected similarity response format: ' + JSON.stringify(result))
  } catch (error) {
    console.error('Error getting similarity scores:', error)
    throw new Error('Failed to get similarity scores')
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    
    let searchQuery: string
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
      searchQuery = await getImageCaption(imageBuffer)
      
    } else {
      // Handle text search
      const body = await request.json()
      const { query, limit: bodyLimit } = body
      
      if (bodyLimit) limit = bodyLimit
      
      if (!query) {
        return NextResponse.json({ error: 'No query provided' }, { status: 400 })
      }
      
      searchQuery = query
    }
    
    // Fetch assets with their description text from BigQuery
    const assetsQuery = `
      SELECT 
        v.id,
        v.descriptionText,
        a.nftMetadata
      FROM \`storygraph-462415.storygraph.vector_embeddings_external\` v
      LEFT JOIN \`storygraph-462415.storygraph.assets_external\` a
      ON v.id = a.id
      WHERE v.descriptionText IS NOT NULL
      AND LENGTH(v.descriptionText) > 0
      LIMIT 500
    `
    
    const [rows] = await bigquery.query({ query: assetsQuery })
    console.log(`Found ${rows.length} assets to compare`)
    
    if (rows.length === 0) {
      return NextResponse.json({ results: [] })
    }
    
    // Process in batches since HF API has limits
    const batchSize = 50 // Adjust based on API limits
    const results: any[] = []
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const descriptions = batch.map((row: any) => row.descriptionText || '')
      
      try {
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rows.length / batchSize)}`)
        const similarities = await getSimilarityScores(searchQuery, descriptions)
        
        // Combine results with metadata
        for (let j = 0; j < batch.length; j++) {
          const row = batch[j]
          const similarity = similarities[j] || 0
          
          results.push({
            id: row.id,
            label: row.nftMetadata?.name || row.id,
            imageUrl: row.nftMetadata?.imageUrl || null,
            description: row.descriptionText,
            similarity: similarity
          })
        }
      } catch (error) {
        console.error(`Error processing batch ${i}-${i + batchSize}:`, error)
        // Continue with next batch if one fails
        continue
      }
      
      // Add small delay between batches to avoid rate limiting
      if (i + batchSize < rows.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Sort by similarity and return top results
    const sortedResults = results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
    
    console.log(`Returning ${sortedResults.length} results`)
    return NextResponse.json({ 
      results: sortedResults,
      query: searchQuery,
      total_processed: results.length
    })
    
  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}