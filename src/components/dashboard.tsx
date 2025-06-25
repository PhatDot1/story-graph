"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { IPAsset } from "@/types"
import { MetricsCards } from "./metrics-cards"
import { SearchBar } from "./search-bar"
import { AssetTable } from "./asset-table"

export function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Fetch data client-side via API
  const { data: assets, isLoading, error } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const response = await fetch("/api/assets")
      if (!response.ok) {
        throw new Error("Failed to fetch assets")
      }
      return response.json() as Promise<IPAsset[]>
    },
    // Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
            IP Asset Dashboard
          </h1>
          <p className="text-muted-foreground">
            Loading assets from the Story Protocol network...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">This may take a moment for large datasets...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
            IP Asset Dashboard
          </h1>
          <p className="text-muted-foreground text-red-500">
            Error loading assets: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold mb-2">Failed to Load Assets</h3>
          <p className="text-muted-foreground mb-4">There was an error loading the asset data.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!assets) return null

  // Filter assets based on search term
  const filteredAssets = assets.filter(
    (asset) =>
      asset.nftMetadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.ipId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.nftMetadata?.tokenId?.includes(searchTerm) ||
      asset.nftMetadata?.tokenContract?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Calculate pagination
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage)
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
          IP Asset Dashboard
        </h1>
        <p className="text-muted-foreground">
          Explore and analyze intellectual property assets on the Story Protocol network
        </p>
      </div>

      <MetricsCards assets={assets} />

      <div className="asset-detail-card p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Asset Explorer</h2>
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} setCurrentPage={setCurrentPage} />
        </div>

        {filteredAssets.length > 0 ? (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {paginatedAssets.length} of {filteredAssets.length.toLocaleString()} assets
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
            <AssetTable
              assets={paginatedAssets}
              currentPage={currentPage}
              totalPages={totalPages}
              setCurrentPage={setCurrentPage}
            />
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold mb-2">No assets found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? `No assets match "${searchTerm}"` : "No assets available"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}