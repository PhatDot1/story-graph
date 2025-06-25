import { BigQuery } from "@google-cloud/bigquery"

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

export async function verifyDataFile() {
  try {
    console.log("Verifying BigQuery table: storygraph-462415.storygraph.assets_external")

    // Check if table exists and get basic info
    const tableInfoQuery = `
      SELECT 
        COUNT(*) as total_rows,
        COUNTIF(ipId IS NOT NULL) as rows_with_ipId,
        COUNTIF(nftMetadata.name IS NOT NULL) as rows_with_name
      FROM \`storygraph-462415.storygraph.assets_external\`
    `

    const [infoRows] = await bigquery.query(tableInfoQuery)
    const info = infoRows[0]

    console.log("Table statistics:")
    console.log("- Total rows:", info.total_rows)
    console.log("- Rows with ipId:", info.rows_with_ipId)
    console.log("- Rows with name:", info.rows_with_name)

    // Get sample data
    const sampleQuery = `
      SELECT 
        ipId,
        nftMetadata.name as name,
        nftMetadata.tokenContract as tokenContract,
        rootIpIds,
        childrenCount,
        descendantCount
      FROM \`storygraph-462415.storygraph.assets_external\`
      LIMIT 3
    `

    const [sampleRows] = await bigquery.query(sampleQuery)

    if (sampleRows.length > 0) {
      console.log("\nSample assets:")
      sampleRows.forEach((row: any, index: number) => {
        console.log(`Asset ${index + 1}:`)
        console.log("- ID:", row.ipId)
        console.log("- Name:", row.name)
        console.log("- Token Contract:", row.tokenContract)
        console.log("- Root IPs:", row.rootIpIds?.length || 0)
        console.log("- Children Count:", row.childrenCount || 0)
        console.log("- Descendant Count:", row.descendantCount || 0)
        console.log("")
      })
    }

    console.log("BigQuery data verification completed successfully!")

  } catch (error) {
    console.error("Error verifying BigQuery data:", error)
    console.error("Make sure:")
    console.error("1. BigQuery credentials are properly configured")
    console.error("2. The table 'storygraph-462415.storygraph.assets_external' exists")
    console.error("3. Your service account has the necessary permissions")
  }
}