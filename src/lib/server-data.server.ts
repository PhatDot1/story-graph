import fs from "fs"
import path from "path"
import type { IPAsset } from "@/types"

// Function to read assets from the NDJSON file (server-side only)
export async function readAssets(): Promise<IPAsset[]> {
  const filePath = path.join(process.cwd(), "assets.ndjson")
  if (!fs.existsSync(filePath)) return []

  const fileContent = await fs.promises.readFile(filePath, "utf-8")
  const lines = fileContent
    .split("\n")
    .filter((line) => line.trim() !== "")

  const assets = lines
    .map((line) => {
      try {
        const parsed = JSON.parse(line)
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
        } as IPAsset
      } catch {
        return null
      }
    })
    .filter(Boolean) as IPAsset[]

  return assets
}
