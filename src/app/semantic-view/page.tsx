import { SemanticVisualization } from "@/components/semantic-visualization"

// This component is now simple, fast, and lightweight.
// It no longer fetches any data.
export default function SemanticViewPage() {
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

      {/* The SemanticVisualization component is now responsible for its own data fetching.
        We no longer pass a 'data' prop here.
      */}
      <SemanticVisualization />
    </div>
  )
}