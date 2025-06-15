import { SemanticVisualization } from "@/components/semantic-visualization"
import fs from "fs"
import path from "path"

async function readEnrichedVectors() {
    const vectorsPath = path.join(process.cwd(), "enriched_vectors_reduced_sample.jsonl")
    const assetsPath = path.join(process.cwd(), "assets-reduced.ndjson")
  
    try {
      const [vectorsRaw, assetsRaw] = await Promise.all([
        fs.promises.readFile(vectorsPath, "utf-8"),
        fs.promises.readFile(assetsPath, "utf-8"),
      ])
  
      const vectorLines = vectorsRaw.split("\n").filter((line) => line.trim() !== "")
      const assetLines = assetsRaw.split("\n").filter((line) => line.trim() !== "")
  
      const vectors = vectorLines.map((line) => JSON.parse(line))
      const assets = assetLines.map((line) => JSON.parse(line))
  
      const assetMap = new Map<string, any>()
      for (const asset of assets) {
        assetMap.set(asset.id.toLowerCase(), asset.nftMetadata)
      }
  
      return vectors.map((vec) => {
        const meta = assetMap.get(vec.id.toLowerCase())
        return {
          ...vec,
          label: meta?.name || vec.id,
          imageUrl: meta?.imageUrl || null,
        }
      })
    } catch (error) {
      console.error("Error reading enriched vectors or assets:", error)
      return []
    }
  }
  

export default async function SemanticViewPage() {
  const data = await readEnrichedVectors()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Semantic View</h1>
        <p className="text-muted-foreground mt-2">
          Explore IP assets based on their semantic similarity using vector embeddings. Assets with similar content are
          positioned closer together in this interactive visualization.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How it works</h3>
        <p className="text-sm text-blue-800">
          Each IP asset is represented by a high-dimensional vector embedding that captures its semantic meaning. We
          calculate cosine similarity between these vectors to determine how related different assets are, then use a
          force-directed graph to visualize these relationships spatially.
        </p>
      </div>

      <SemanticVisualization data={data} />
    </div>
  )
}
