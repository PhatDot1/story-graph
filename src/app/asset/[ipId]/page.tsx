import { AssetDetail } from "@/components/asset-detail"
import { MiniSemanticGraph } from "@/components/mini-semantic-graph"
import { readAssets } from "@/lib/server-data.server"
import { notFound } from "next/navigation"
import { BigQuery } from '@google-cloud/bigquery'
import type { IPAsset } from "@/types"
import React from 'react'

interface AssetPageProps {
  params: Promise<{
    ipId: string
  }>
}

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
  credentials: {
    type: process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_TYPE!,
    project_id: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID!,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL!,
    client_id: process.env.GOOGLE_CLOUD_CLIENT_ID!,
  },
})

async function getSimilarAssets(ipId: string) {
  try {
    console.log(`Looking for similar assets to: ${ipId}`)
    
    // Clean BigQuery query using only string parameters
    const similarAssetsQuery = `
      WITH current_asset AS (
        SELECT embedding
        FROM \`storygraph-462415.storygraph.vector_embeddings_external\`
        WHERE id = @ipId
        LIMIT 1
      ),
      similarities AS (
        SELECT 
          v.id,
          v.embedding,
          v.descriptionText,
          a.nftMetadata,
          -- Calculate cosine similarity
          (
            SELECT SUM(v_val * c_val) / (
              SQRT(SUM(v_val * v_val)) * SQRT(SUM(c_val * c_val))
            )
            FROM UNNEST(v.embedding) AS v_val WITH OFFSET pos1
            JOIN UNNEST(c.embedding) AS c_val WITH OFFSET pos2
            ON pos1 = pos2
          ) as similarity
        FROM \`storygraph-462415.storygraph.vector_embeddings_external\` v
        LEFT JOIN \`storygraph-462415.storygraph.assets_external\` a 
        ON v.id = a.id
        CROSS JOIN current_asset c
        WHERE v.id != @ipId
        AND v.embedding IS NOT NULL
      )
      SELECT *
      FROM similarities
      WHERE similarity IS NOT NULL
      ORDER BY similarity DESC
      LIMIT 25
    `

    const [similarResult] = await bigquery.query({
      query: similarAssetsQuery,
      params: { ipId }, // Only passing ipId as string
      useLegacySql: false,
    })

    console.log(`Found ${similarResult.length} similar assets from BigQuery`)

    if (similarResult.length === 0) {
      console.log("No similar assets found in BigQuery")
      return null
    }

    // Process similar assets for the graph
    const graphData = similarResult.map((row: any) => ({
      id: row.id,
      label: row.nftMetadata?.name || row.id,
      descriptionText: row.descriptionText || 'No description available',
      embedding: row.embedding,
      imageUrl: row.nftMetadata?.imageUrl || null,
      similarity: row.similarity || 0,
    }))

    return graphData
  } catch (error) {
    console.error("Error fetching similar assets from BigQuery:", error)
    return null
  }
}

// Make sure this is properly typed as a React component
const AssetPage: React.FC<AssetPageProps> = async ({ params }) => {
  try {
    const { ipId } = await params
    console.log("Looking for asset with ipId:", ipId)

    // Use your original method to find the asset
    const assets = await readAssets()
    console.log("Total assets loaded:", assets.length)
    console.log(
      "First few asset IDs:",
      assets.slice(0, 3).map((a) => a.ipId),
    )

    const asset = assets.find((a) => a.ipId === ipId)
    console.log("Found asset:", asset ? "YES" : "NO")

    if (!asset) {
      console.log("Asset not found, returning 404")
      notFound()
    }

    // Try to get similar assets from BigQuery for the visualization
    const similarAssetsData = await getSimilarAssets(ipId)
    
    // If we have similarity data, create the graph data including the current asset
    let graphData = null
    if (similarAssetsData && similarAssetsData.length > 0) {
      // Add the current asset to the graph data
      graphData = [
        {
          id: asset.ipId,
          label: asset.nftMetadata?.name || asset.ipId,
          descriptionText: 'Current asset',
          embedding: [], // We don't have the embedding for the current asset from the file
          imageUrl: asset.nftMetadata?.imageUrl || null,
          similarity: 1.0,
        },
        ...similarAssetsData
      ]
      console.log(`Created graph data with ${graphData.length} total assets`)
    } else {
      console.log("No similarity data available for visualization")
    }

    return (
      <div className="space-y-8">
        <AssetDetail asset={asset} relatedAssets={assets} />
        
        {/* Mini Semantic Graph - only show if we have similarity data */}
        {graphData && graphData.length > 1 && (
          <div className="border-t border-border pt-8">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-foreground">Semantic Similarity Graph</h2>
              <p className="text-muted-foreground mt-1">
                Visual representation of the 25 most similar assets to this IP asset
              </p>
            </div>
            <MiniSemanticGraph 
              data={graphData} 
              centerAssetId={asset.ipId}
            />
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error("Error in AssetPage:", error)
    notFound()
  }
}

// Export the component as default
export default AssetPage

export async function generateMetadata({ params }: AssetPageProps) {
  try {
    const { ipId } = await params
    const assets = await readAssets()
    const asset = assets.find((a) => a.ipId === ipId)

    if (!asset) {
      return {
        title: "Asset Not Found - IP Radar",
      }
    }

    return {
      title: `${asset.nftMetadata?.name || "IP Asset"} - IP Radar`,
      description: `View details for IP Asset ${asset.ipId} and explore similar assets`,
    }
  } catch (error) {
    return {
      title: "Asset Not Found - IP Radar",
    }
  }
}