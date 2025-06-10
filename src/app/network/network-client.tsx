"use client"

import { useEffect, useState } from "react"
import { D3NetworkVisualization } from "@/components/d3-network-visualization"
import { NetworkVisualization } from "@/components/network-visualization"
import { fetchOptimizedNetworkData, fetchNetworkData, fetchCommunityViewData } from "@/lib/data-processor"

interface ProcessedNetworkData {
  nodes: any[]
  edges: any[]
  stats: any
}

interface CommunityViewData {
  nodes: any[]
  edges: any[]
  stats: any
}

type ViewMode = "community" | "optimized" | "full"

export function NetworkPageClient() {
  const [networkData, setNetworkData] = useState<ProcessedNetworkData | null>(null)
  const [communityData, setCommunityData] = useState<CommunityViewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("community")
  const [isLoadingMode, setIsLoadingMode] = useState(false)

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Load community view by default (fastest and cleanest)
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

    loadInitialData()
  }, [])

  const handleViewModeChange = async (newMode: ViewMode) => {
    if (newMode === viewMode || isLoadingMode) return

    try {
      setIsLoadingMode(true)
      setError(null)

      if (newMode === "community") {
        if (!communityData) {
          const data = await fetchCommunityViewData()
          setCommunityData(data)
        }
      } else if (newMode === "optimized") {
        const data = await fetchOptimizedNetworkData()
        setNetworkData(data)
      } else if (newMode === "full") {
        const data = await fetchNetworkData()
        setNetworkData(data)
      }

      setViewMode(newMode)
    } catch (err) {
      console.error(`Failed to load ${newMode} view:`, err)
      setError(`Failed to load ${newMode} view`)
    } finally {
      setIsLoadingMode(false)
    }
  }

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

  if (error || (!communityData && !networkData)) {
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

  const currentData = viewMode === "community" ? communityData : networkData
  if (!currentData) return null

  const getStatsText = () => {
    if (viewMode === "community") {
      return `${communityData?.stats.visibleCommunities} communities representing ${communityData?.stats.totalAssets.toLocaleString()} assets`
    } else if (viewMode === "optimized") {
      return `${networkData?.stats.optimizedNodes || networkData?.nodes.length} optimized nodes from ${networkData?.stats.totalAssets.toLocaleString()} total assets`
    } else {
      return `${networkData?.nodes.length} nodes from ${networkData?.stats.totalAssets.toLocaleString()} total assets`
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
              IP Asset Network
            </h1>
            <p className="text-muted-foreground">Interactive network visualization showing {getStatsText()}.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right mr-4">
              <div className="text-sm font-medium">
                {viewMode === "community" && <span className="text-blue-600">Community View</span>}
                {viewMode === "optimized" && <span className="text-green-600">Optimized View</span>}
                {viewMode === "full" && <span className="text-yellow-600">Full Dataset</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {viewMode === "community" && "Communities as blobs (D3.js)"}
                {viewMode === "optimized" && "Major communities only"}
                {viewMode === "full" && "All communities loaded"}
              </div>
            </div>

            <select
              value={viewMode}
              onChange={(e) => handleViewModeChange(e.target.value as ViewMode)}
              disabled={isLoadingMode}
              className="bg-input border border-border rounded px-3 py-2 text-sm"
            >
              <option value="community">Community View (D3.js)</option>
              <option value="optimized">Optimized View</option>
              <option value="full">Full Dataset</option>
            </select>

            {isLoadingMode && (
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
            )}
          </div>
        </div>

        {/* Dataset Info for Community View */}
        {viewMode === "community" && communityData?.stats.communityBreakdown && (
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

        {/* Performance Warning */}
        {viewMode === "full" && networkData && networkData.nodes.length > 1000 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="text-yellow-500">⚠️</div>
              <div>
                <div className="font-medium text-yellow-600">Performance Notice</div>
                <div className="text-sm text-muted-foreground">
                  Rendering {networkData.nodes.length} nodes may impact performance. Consider using the community view
                  for better responsiveness.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1">
        {viewMode === "community" && communityData ? (
          <D3NetworkVisualization communityData={communityData} />
        ) : (
          networkData && (
            <NetworkVisualization networkData={networkData} assets={[]} isOptimizedView={viewMode === "optimized"} />
          )
        )}
      </div>
    </div>
  )
}
