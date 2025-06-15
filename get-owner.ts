import "dotenv/config"
import fs from "fs"
import path from "path"
import { ethers } from "ethers"

// ── CONFIG ─────────────────────────────────────────────────────────────────────
const RPC         = "https://aeneid.storyrpc.io"    // Aeneid Testnet RPC
const CHAIN_ID    = 1315

const INPUT_FILE  = path.resolve(process.cwd(), "assets.ndjson")
const OUTPUT_FILE = path.resolve(process.cwd(), "assets-owner.ndjson")

// ── ABI ─────────────────────────────────────────────────────────────────────────
const nftAbi = [
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)"
]

// ── MAIN ────────────────────────────────────────────────────────────────────────
async function main() {
  const provider = new ethers.JsonRpcProvider(RPC)

  // Read all lines from assets.ndjson
  const raw = await fs.promises.readFile(INPUT_FILE, "utf-8")
  const lines = raw.split("\n").filter((l) => l.trim())

  // Prepare output stream
  const out = fs.createWriteStream(OUTPUT_FILE, { flags: "w" })

  for (const line of lines) {
    try {
      const asset = JSON.parse(line)
      const contract = asset.nftMetadata?.tokenContract
      const tokenId   = asset.nftMetadata?.tokenId

      let owner: string | null = null
      let metadataUri: string | null = null

      if (contract && tokenId) {
        const nft = new ethers.Contract(contract, nftAbi, provider)
        owner = await nft.ownerOf(tokenId).catch(() => null)
        metadataUri = await nft.tokenURI(tokenId).catch(() => null)
      }

      // Attach results
      asset.owner = owner
      asset.metadataUri = metadataUri

      // Write enriched asset as NDJSON
      out.write(JSON.stringify(asset) + "\n")
      console.log(`Processed ${contract} #${tokenId} → owner: ${owner}`)
    } catch (err) {
      console.error("Error processing line:", err)
    }
  }

  out.close()
  console.log(`\n✅ Done. Wrote results to ${OUTPUT_FILE}`)
}

main().catch((e) => {
  console.error("Script failed:", e)
  process.exit(1)
})
