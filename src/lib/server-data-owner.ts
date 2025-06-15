import fs from "fs"
import path from "path"
import type { IPAsset } from "@/types"

// This extends IPAsset with the `owner` and `metadataUri` fields
export interface IPAssetWithOwner extends IPAsset {
  owner?: string
  metadataUri?: string
}

export async function readOwnerAssets(): Promise<IPAssetWithOwner[]> {
  const filePath = path.join(process.cwd(), "assets-owner.ndjson")
  if (!fs.existsSync(filePath)) return []

  const lines = (await fs.promises.readFile(filePath, "utf-8"))
    .split("\n")
    .filter((l) => l.trim())

  return lines
    .map((line) => {
      try {
        const parsed = JSON.parse(line)
        return {
          ...parsed,
          // ensure nftMetadata shape is present
          nftMetadata: {
            name: parsed.nftMetadata?.name ?? "",
            chainId: parsed.nftMetadata?.chainId ?? "",
            tokenContract: parsed.nftMetadata?.tokenContract ?? "",
            tokenId: parsed.nftMetadata?.tokenId ?? "",
            tokenUri: parsed.nftMetadata?.tokenUri ?? "",
            imageUrl: parsed.nftMetadata?.imageUrl ?? "",
            ...parsed.nftMetadata,
          },
        } as IPAssetWithOwner
      } catch {
        return null
      }
    })
    .filter(Boolean) as IPAssetWithOwner[]
}
