import fs from "fs"
import path from "path"

export function verifyDataFile() {
  const filePath = path.join(process.cwd(), "assets.ndjson")
  console.log("Looking for file at:", filePath)
  console.log("File exists:", fs.existsSync(filePath))

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath)
    console.log("File size:", stats.size, "bytes")

    const content = fs.readFileSync(filePath, "utf-8")
    const lines = content.split("\n").filter((line) => line.trim() !== "")
    console.log("Number of lines:", lines.length)

    if (lines.length > 0) {
      try {
        const firstAsset = JSON.parse(lines[0])
        console.log("First asset ID:", firstAsset.ipId)
        console.log("First asset name:", firstAsset.nftMetadata?.name)
      } catch (error) {
        console.error("Error parsing first line:", error)
      }
    }
  }
}
