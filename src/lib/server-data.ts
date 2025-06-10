import fs from "fs"
import path from "path"
import type { IPAsset } from "@/types"

// Function to read assets from the NDJSON file (server-side only)
export async function readAssets(): Promise<IPAsset[]> {
  try {
    const filePath = path.join(process.cwd(), "assets.ndjson")
    console.log("Reading assets from:", filePath)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error("Assets file does not exist at:", filePath)
      return []
    }

    const fileContent = await fs.promises.readFile(filePath, "utf-8")
    console.log("File content length:", fileContent.length)

    // Parse NDJSON (each line is a separate JSON object)
    const lines = fileContent.split("\n").filter((line) => line.trim() !== "")
    console.log("Number of lines:", lines.length)

    const assets: IPAsset[] = lines
      .map((line, index) => {
        try {
          const parsed = JSON.parse(line)
          // Ensure all required fields exist with defaults
          return {
            ...parsed,
            rootIpIds: parsed.rootIpIds || [],
            childrenCount: parsed.childrenCount || 0,
            descendantCount: parsed.descendantCount || 0,
            parentCount: parsed.parentCount || 0,
            isGroup: parsed.isGroup || false,
            nftMetadata: {
              name: parsed.nftMetadata?.name || "",
              chainId: parsed.nftMetadata?.chainId || "1315",
              tokenContract: parsed.nftMetadata?.tokenContract || "",
              tokenId: parsed.nftMetadata?.tokenId || "",
              tokenUri: parsed.nftMetadata?.tokenUri || "",
              imageUrl: parsed.nftMetadata?.imageUrl || "",
              ...parsed.nftMetadata,
            },
          }
        } catch (parseError) {
          console.error(`Error parsing line ${index + 1}:`, parseError)
          return null
        }
      })
      .filter(Boolean) as IPAsset[]

    console.log("Successfully parsed assets:", assets.length)
    if (assets.length > 0) {
      console.log(
        "Sample asset IDs:",
        assets.slice(0, 3).map((a) => a.ipId),
      )
    }

    return assets
  } catch (error) {
    console.error("Error reading assets file:", error)
    return []
  }
}
