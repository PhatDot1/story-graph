// app/api/assets/route.ts
import { NextResponse } from "next/server"
import { BigQuery } from "@google-cloud/bigquery"
import type { IPAsset } from "@/types"

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

async function fetchAssets(): Promise<IPAsset[]> {
  try {
    const query = `
      SELECT *
      FROM \`storygraph-462415.storygraph.assets_external\`
      ORDER BY descendantCount DESC, childrenCount DESC
      LIMIT 35000
    `

    const [rows] = await bigquery.query(query)

    const assets = rows
      .map((row: any) => {
        try {
          return {
            ...row,
            rootIpIds: row.rootIpIds || [],
            childrenCount: row.childrenCount || 0,
            descendantCount: row.descendantCount || 0,
            parentCount: row.parentCount || 0,
            isGroup: row.isGroup || false,
            nftMetadata: {
              name: row.nftMetadata?.name || "",
              chainId: row.nftMetadata?.chainId || "1315",
              tokenContract: row.nftMetadata?.tokenContract || "",
              tokenId: row.nftMetadata?.tokenId || "",
              tokenUri: row.nftMetadata?.tokenUri || "",
              imageUrl: row.nftMetadata?.imageUrl || "",
              ...row.nftMetadata,
            },
          } as IPAsset
        } catch (error) {
          console.error("Error parsing asset row:", error)
          return null
        }
      })
      .filter(Boolean) as IPAsset[]

    console.log(`Fetched ${assets.length} assets from BigQuery`)
    return assets
  } catch (error) {
    console.error("Error fetching assets from BigQuery:", error)
    throw new Error("Failed to fetch assets from BigQuery")
  }
}

export async function GET() {
  try {
    const assets = await fetchAssets()
    return NextResponse.json(assets)
  } catch (error) {
    console.error("Error in assets API route:", error)
    return NextResponse.json(
      { error: "Failed to fetch assets" }, 
      { status: 500 }
    )
  }
}

// Increase timeout for large dataset
export const maxDuration = 60