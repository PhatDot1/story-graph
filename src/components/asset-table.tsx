"use client"

import Link from "next/link"
import type { IPAsset } from "@/types"
import { formatTimestamp, getContractName } from "@/lib/data"

interface AssetTableProps {
  assets: IPAsset[]
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
}

export function AssetTable({ assets, currentPage, totalPages, setCurrentPage }: AssetTableProps) {
  const hasValidImage = (imageUrl: string | undefined | null): boolean => {
    return Boolean(imageUrl && imageUrl.trim() !== "" && imageUrl !== "null" && imageUrl !== "undefined")
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="table-header">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Collection
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Children
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {assets.length > 0 ? (
              assets.map((asset) => (
                <tr key={asset.ipId} className="table-row">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {hasValidImage(asset.nftMetadata?.imageUrl) ? (
                        <img
                          src={asset.nftMetadata!.imageUrl || "/placeholder.svg"}
                          alt={asset.nftMetadata?.name || "Asset image"}
                          className="h-10 w-10 rounded-lg object-cover mr-3"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mr-3 border border-border">
                          <span className="text-xs">🖼️</span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {asset.nftMetadata?.name || "Unnamed Asset"}
                        </div>
                        <div className="text-xs text-muted-foreground">Token #{asset.nftMetadata?.tokenId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground font-mono" title={asset.ipId}>
                      {asset.ipId ? asset.ipId.substring(0, 8) + "..." : "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">
                      {asset.nftMetadata?.tokenContract ? getContractName(asset.nftMetadata.tokenContract) : "Unknown"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm text-foreground">{asset.childrenCount || 0}</span>
                      {asset.descendantCount > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground">({asset.descendantCount} total)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {asset.blockTimestamp ? formatTimestamp(asset.blockTimestamp) : "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/asset/${encodeURIComponent(asset.ipId)}`}
                      className="link-primary hover:underline"
                      onClick={() => console.log("Navigating to asset:", asset.ipId)}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">
                  No assets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-btn px-4 py-2 rounded-md"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="pagination-btn px-4 py-2 rounded-md"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
