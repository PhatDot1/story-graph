import { readAssets } from "@/lib/server-data.server"

export default async function DebugPage() {
  const assets = await readAssets()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Debug Information</h1>

      <div className="bg-card p-6 rounded-lg border">
        <h2 className="text-lg font-semibold mb-4">Assets Data</h2>
        <p>
          <strong>Total assets loaded:</strong> {assets.length}
        </p>

        {assets.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">First 5 Asset IDs:</h3>
            <ul className="space-y-1 font-mono text-sm">
              {assets.slice(0, 5).map((asset, index) => (
                <li key={index} className="bg-muted p-2 rounded">
                  {asset.ipId} - {asset.nftMetadata?.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {assets.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Sample Asset Data:</h3>
            <pre className="bg-muted p-4 rounded text-xs overflow-auto">{JSON.stringify(assets[0], null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
