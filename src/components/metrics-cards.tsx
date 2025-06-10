"use client"

import type { IPAsset } from "@/types"
import { getContractName } from "@/lib/data"

interface MetricsCardsProps {
  assets: IPAsset[]
}

export function MetricsCards({ assets }: MetricsCardsProps) {
  // Calculate metrics
  const totalAssets = assets.length

  const assetsWithChildren = assets.filter((asset) => asset.childrenCount > 0).length

  const uniqueContracts = new Set(assets.map((asset) => asset.nftMetadata?.tokenContract).filter(Boolean)).size

  const totalDescendants = assets.reduce((sum, asset) => sum + (asset.descendantCount || 0), 0)

  const contractCounts = assets.reduce(
    (acc, asset) => {
      const contract = asset.nftMetadata?.tokenContract
      if (contract) {
        acc[contract] = (acc[contract] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>,
  )

  const topContract = Object.entries(contractCounts).sort((a, b) => b[1] - a[1])[0]
  const topContractName = topContract ? getContractName(topContract[0]) : "None"

  const metrics = [
    { label: "Total Assets", value: totalAssets.toLocaleString(), icon: "📊" },
    { label: "Parent Assets", value: assetsWithChildren, icon: "🌳" },
    { label: "Unique Contracts", value: uniqueContracts, icon: "📄" },
    { label: "Top Collection", value: topContractName, icon: "🏆" },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <div key={metric.label} className={`metric-card glow-hover ${index === 0 ? "glow-primary" : ""}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">{metric.label}</p>
              <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                {metric.value}
              </p>
            </div>
            <div className="text-2xl opacity-60">{metric.icon}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
