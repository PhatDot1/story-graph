"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { IPAsset } from "@/types"
import { MetricsCards } from "./metrics-cards"
import { SearchBar } from "./search-bar"
import { AssetTable } from "./asset-table"

interface DashboardProps {
  initialAssets: IPAsset[]
}

export function Dashboard({ initialAssets }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // Use React Query to manage the data
  const { data: assets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => initialAssets,
    initialData: initialAssets,
  })

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
              Showing {paginatedAssets.length} of {filteredAssets.length} assets
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
