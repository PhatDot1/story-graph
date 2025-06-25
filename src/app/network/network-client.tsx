"use client"

import { useEffect, useState } from "react"
import { D3NetworkVisualization } from "@/components/d3-network-visualization"
import { fetchCommunityViewData } from "@/lib/data-processor"

interface CommunityViewData {
  nodes: any[]
  edges: any[]
  stats: any
}

export function NetworkPageClient() {
  const [communityData, setCommunityData] = useState<CommunityViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await fetchCommunityViewData()
        setCommunityData(data)
        console.log("Community data loaded:", data)
      } catch (err) {
        console.error("Failed to load community view data:", err)
        setError("Failed to load network data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Network Data</h2>
          <p className="text-muted-foreground">Loading community overview...</p>
        </div>
      </div>
    )
  }

  if (error || !communityData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Failed to Load Network</h2>
          <p className="text-muted-foreground mb-4">{error || "Unknown error occurred"}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
              IP Asset Network
            </h1>
            <p className="text-muted-foreground">
              Interactive network visualization showing {communityData.stats.visibleCommunities} communities representing {communityData.stats.totalAssets.toLocaleString()} assets.
            </p>
          </div>
        </div>

        {/* Dataset Info */}
        {communityData?.stats.communityBreakdown && (
          <div className="bg-card p-4 rounded-lg border mb-4">
            <h3 className="font-semibold mb-2">Community Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Large Communities</div>
                <div className="font-semibold">{communityData.stats.communityBreakdown.large} (100+ assets)</div>
              </div>
              <div>
                <div className="text-muted-foreground">Medium Communities</div>
                <div className="font-semibold">{communityData.stats.communityBreakdown.medium} (20-99 assets)</div>
              </div>
              <div>
                <div className="text-muted-foreground">Small Communities</div>
                <div className="font-semibold">{communityData.stats.communityBreakdown.small} (10-19 assets)</div>
              </div>
              <div>
                <div className="text-muted-foreground">Tiny Communities</div>
                <div className="font-semibold">{communityData.stats.communityBreakdown.tiny} (5-9 assets)</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Showing {communityData.stats.visibleCommunities} communities with 5+ assets.
              {communityData.stats.totalConnections} cross-community connections detected.
            </div>
          </div>
        )}
      </div>

      <div className="flex-1">
        <D3NetworkVisualization communityData={communityData} />
      </div>
    </div>
  )
}