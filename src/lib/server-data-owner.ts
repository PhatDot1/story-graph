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

// This extends IPAsset with the `owner` and `metadataUri` fields
export interface IPAssetWithOwner extends IPAsset {
  owner?: string
  metadataUri?: string
}

export async function readOwnerAssets(): Promise<IPAssetWithOwner[]> {
  try {
    const query = `
      SELECT 
        id,
        ipId,
        tokenId,
        rootIpIds,
        childrenCount,
        descendantCount,
        parentCount,
        isGroup,
        nftMetadata,
        owner,
        metadataUri,
        blockNumber,
        blockTimestamp,
        transactionHash,
        latestArbitrationPolicy,
        rootCount,
        ancestorCount
      FROM \`storygraph-462415.storygraph.assets_owner_fixed\`
    `

    const [rows] = await bigquery.query(query)

    const assets = rows
      .map((row: any) => {
        try {
          return {
            id: row.id,
            ipId: row.ipId,
            tokenId: row.tokenId,
            rootIpIds: row.rootIpIds || [],
            childrenCount: row.childrenCount || 0,
            descendantCount: row.descendantCount || 0,
            parentCount: row.parentCount || 0,
            isGroup: row.isGroup || false,
            owner: row.owner,
            metadataUri: row.metadataUri,
            blockNumber: row.blockNumber,
            blockTimestamp: row.blockTimestamp,
            transactionHash: row.transactionHash,
            latestArbitrationPolicy: row.latestArbitrationPolicy,
            rootCount: row.rootCount || 0,
            ancestorCount: row.ancestorCount || 0,
            // ensure nftMetadata shape is present
            nftMetadata: {
              name: row.nftMetadata?.name ?? "",
              chainId: row.nftMetadata?.chainId ?? "",
              tokenContract: row.nftMetadata?.tokenContract ?? "",
              tokenId: row.nftMetadata?.tokenId ?? "",
              tokenUri: row.nftMetadata?.tokenUri ?? "",
              imageUrl: row.nftMetadata?.imageUrl ?? "",
              ...row.nftMetadata,
            },
          } as IPAssetWithOwner
        } catch (error) {
          console.error("Error parsing asset row:", error)
          return null
        }
      })
      .filter(Boolean) as IPAssetWithOwner[]

    console.log(`Successfully loaded ${assets.length} assets with owner data from BigQuery`)
    return assets
  } catch (error) {
    console.error("Error fetching owner assets from BigQuery:", error)
    return []
  }
}