import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { IPAsset } from "@/types"

interface OptimizedNetworkData {
  nodes: Array<{
    id: string
    label: string
    size: number
    community: number
    color: string
    descendantCount: number
    childrenCount: number
    isGroup: boolean
    tokenContract?: string
    assetCount?: number
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    weight: number
    type: string
  }>
  stats: {
    totalAssets: number
    totalContracts: number
    totalCommunities: number
    filteredCommunities: number
    largestCommunity: number
    optimizedNodes: number
    optimizedEdges: number
    communityBreakdown: {
      large: number // 100+ assets
      medium: number // 20-99 assets
      small: number // 10-19 assets
      tiny: number // <10 assets
    }
  }
}

async function processOptimizedNetworkData(): Promise<OptimizedNetworkData> {
  const filePath = path.join(process.cwd(), "assets.ndjson")

  if (!fs.existsSync(filePath)) {
    throw new Error("Assets file not found")
  }

  const fileContent = await fs.promises.readFile(filePath, "utf-8")
  const lines = fileContent.split("\n").filter((line) => line.trim() !== "")

  const assets: IPAsset[] = lines
    .map((line, index) => {
      try {
        return JSON.parse(line)
      } catch (parseError) {
        console.error(`Error parsing line ${index + 1}:`, parseError)
        return null
      }
    })
    .filter(Boolean) as IPAsset[]

  console.log(`Processing ${assets.length} assets for optimized network visualization`)

  // More realistic thresholds for this dataset
  const LARGE_COMMUNITY_THRESHOLD = 100 // Show as group nodes
  const MEDIUM_COMMUNITY_THRESHOLD = 20 // Show important nodes only
  const SMALL_COMMUNITY_THRESHOLD = 10 // Show all nodes
  const MIN_COMMUNITY_SIZE = 5 // Minimum to include at all

  // Group assets by token contract (communities)
  const contractGroups = new Map<string, IPAsset[]>()
  const rootAssets = new Set<string>()

  assets.forEach((asset) => {
    const contract = asset.nftMetadata?.tokenContract || "unknown"
    if (!contractGroups.has(contract)) {
      contractGroups.set(contract, [])
    }
    contractGroups.get(contract)!.push(asset)

    // Track root assets (assets with no parents)
    if ((!asset.rootIpIds || asset.rootIpIds.length === 0) && (!asset.parentCount || asset.parentCount === 0)) {
      rootAssets.add(asset.ipId)
    }
  })

  // Create community mapping and stats
  const communityMap = new Map<string, number>()
  const communityStats = new Map<number, { size: number; hasConnections: boolean }>()
  let communityId = 0

  // Community breakdown stats
  const communityBreakdown = { large: 0, medium: 0, small: 0, tiny: 0 }

  // Assign community IDs and categorize
  contractGroups.forEach((contractAssets, contract) => {
    const size = contractAssets.length

    // Categorize for stats
    if (size >= 100) communityBreakdown.large++
    else if (size >= 20) communityBreakdown.medium++
    else if (size >= 10) communityBreakdown.small++
    else communityBreakdown.tiny++

    // Only include communities with minimum size
    if (size >= MIN_COMMUNITY_SIZE) {
      communityMap.set(contract, communityId)

      // Check if community has any internal connections
      let hasConnections = false
      for (const asset of contractAssets) {
        if (asset.rootIpIds.some((rootId) => contractAssets.some((a) => a.ipId === rootId))) {
          hasConnections = true
          break
        }
        if (asset.childrenCount > 0 || asset.descendantCount > 0) {
          hasConnections = true
          break
        }
      }

      communityStats.set(communityId, { size, hasConnections })
      communityId++
    }
  })

  console.log(`Community breakdown:`, communityBreakdown)
  console.log(
    `Communities with min size (${MIN_COMMUNITY_SIZE}+): ${communityStats.size} out of ${contractGroups.size}`,
  )

  // For optimization, prioritize larger communities and those with connections
  const qualifyingCommunities = new Set<number>()
  communityStats.forEach((stats, id) => {
    // Include if:
    // 1. Large community (100+ assets) - always include
    // 2. Medium community (20+ assets) - always include
    // 3. Small community (10+ assets) with connections
    // 4. Or if we don't have enough communities yet, include smaller ones
    if (
      stats.size >= MEDIUM_COMMUNITY_THRESHOLD ||
      (stats.size >= SMALL_COMMUNITY_THRESHOLD && stats.hasConnections) ||
      qualifyingCommunities.size < 20 // Ensure we have at least some communities
    ) {
      qualifyingCommunities.add(id)
    }
  })

  // If still no qualifying communities, lower the bar further
  if (qualifyingCommunities.size === 0) {
    console.log("No communities qualified with strict criteria, lowering thresholds...")
    communityStats.forEach((stats, id) => {
      if (stats.size >= MIN_COMMUNITY_SIZE) {
        qualifyingCommunities.add(id)
      }
    })
  }

  console.log(`Qualifying communities: ${qualifyingCommunities.size} out of ${communityStats.size}`)

  // Color palette for communities
  const colors = [
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
    "#84cc16",
    "#6366f1",
    "#f97316",
    "#14b8a6",
    "#a855f7",
    "#0ea5e9",
    "#22c55e",
    "#eab308",
    "#f43f5e",
    "#d946ef",
    "#65a30d",
    "#3b82f6",
  ]

  const nodes: OptimizedNetworkData["nodes"] = []
  const edges: OptimizedNetworkData["edges"] = []
  const edgeSet = new Set<string>()

  // Process qualifying communities
  contractGroups.forEach((contractAssets, contract) => {
    const community = communityMap.get(contract)
    if (community === undefined || !qualifyingCommunities.has(community)) {
      return // Skip this community
    }

    const color = colors[community % colors.length]
    const size = contractAssets.length

    if (size >= LARGE_COMMUNITY_THRESHOLD) {
      // Very large community: Create a single group node
      const totalDescendants = contractAssets.reduce((sum, asset) => sum + (asset.descendantCount || 0), 0)
      const totalChildren = contractAssets.reduce((sum, asset) => sum + (asset.childrenCount || 0), 0)

      nodes.push({
        id: `group_${contract}`,
        label: getContractName(contract),
        size: Math.min(120, 50 + Math.log(size) * 15),
        community,
        color,
        descendantCount: totalDescendants,
        childrenCount: totalChildren,
        isGroup: true,
        tokenContract: contract,
        assetCount: size,
      })
    } else if (size >= MEDIUM_COMMUNITY_THRESHOLD) {
      // Medium community: Show important assets only
      const importantAssets = contractAssets
        .filter((asset) => {
          return (
            rootAssets.has(asset.ipId) ||
            (asset.descendantCount || 0) > 2 ||
            (asset.childrenCount || 0) > 1 ||
            asset.rootIpIds.length > 0 // Has parents
          )
        })
        .slice(0, Math.min(25, Math.ceil(size * 0.3))) // Show up to 30% of assets, max 25

      // If no important assets found, show first few assets
      if (importantAssets.length === 0) {
        importantAssets.push(...contractAssets.slice(0, Math.min(5, size)))
      }

      importantAssets.forEach((asset) => {
        nodes.push({
          id: asset.ipId,
          label: asset.nftMetadata?.name?.substring(0, 25) || asset.ipId.substring(0, 8),
          size: Math.max(25, Math.min(70, 25 + (asset.descendantCount || 0) * 3)),
          community,
          color,
          descendantCount: asset.descendantCount || 0,
          childrenCount: asset.childrenCount || 0,
          isGroup: false,
          tokenContract: contract,
        })
      })

      // Create edges between important assets
      importantAssets.forEach((asset) => {
        if (asset.rootIpIds) {
          asset.rootIpIds.forEach((rootId) => {
            if (importantAssets.some((a) => a.ipId === rootId)) {
              const edgeId = `${rootId}-${asset.ipId}`
              if (!edgeSet.has(edgeId)) {
                edges.push({
                  id: edgeId,
                  source: rootId,
                  target: asset.ipId,
                  weight: 2,
                  type: "parent-child",
                })
                edgeSet.add(edgeId)
              }
            }
          })
        }
      })
    } else {
      // Small community: Show all assets (up to a reasonable limit)
      const assetsToShow = contractAssets.slice(0, Math.min(15, size))

      assetsToShow.forEach((asset) => {
        nodes.push({
          id: asset.ipId,
          label: asset.nftMetadata?.name?.substring(0, 20) || asset.ipId.substring(0, 8),
          size: Math.max(20, Math.min(50, 20 + (asset.descendantCount || 0) * 4)),
          community,
          color,
          descendantCount: asset.descendantCount || 0,
          childrenCount: asset.childrenCount || 0,
          isGroup: false,
          tokenContract: contract,
        })
      })

      // Create edges for small communities
      assetsToShow.forEach((asset) => {
        if (asset.rootIpIds) {
          asset.rootIpIds.forEach((rootId) => {
            if (assetsToShow.some((a) => a.ipId === rootId)) {
              const edgeId = `${rootId}-${asset.ipId}`
              if (!edgeSet.has(edgeId)) {
                edges.push({
                  id: edgeId,
                  source: rootId,
                  target: asset.ipId,
                  weight: 1,
                  type: "parent-child",
                })
                edgeSet.add(edgeId)
              }
            }
          })
        }
      })
    }
  })

  // Create some inter-community connections (limited for performance)
  const maxInterConnections = Math.min(30, Math.floor(nodes.length * 0.1))
  let interConnectionCount = 0

  assets.forEach((asset) => {
    if (interConnectionCount >= maxInterConnections) return

    const assetCommunity = communityMap.get(asset.nftMetadata?.tokenContract || "")
    if (!assetCommunity || !qualifyingCommunities.has(assetCommunity)) return

    if (asset.rootIpIds) {
      asset.rootIpIds.forEach((rootId) => {
        const rootAsset = assets.find((a) => a.ipId === rootId)
        if (!rootAsset) return

        const rootCommunity = communityMap.get(rootAsset.nftMetadata?.tokenContract || "")
        if (!rootCommunity || !qualifyingCommunities.has(rootCommunity)) return

        if (rootCommunity !== assetCommunity) {
          // Cross-community connection
          const sourceId = nodes.find((n) => n.id === rootId) ? rootId : `group_${rootAsset.nftMetadata?.tokenContract}`
          const targetId = nodes.find((n) => n.id === asset.ipId)
            ? asset.ipId
            : `group_${asset.nftMetadata?.tokenContract}`

          const edgeId = `${sourceId}-${targetId}`
          if (!edgeSet.has(edgeId) && nodes.some((n) => n.id === sourceId) && nodes.some((n) => n.id === targetId)) {
            edges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              weight: 3,
              type: "cross-community",
            })
            edgeSet.add(edgeId)
            interConnectionCount++
          }
        }
      })
    }
  })

  const stats = {
    totalAssets: assets.length,
    totalContracts: contractGroups.size,
    totalCommunities: communityStats.size,
    filteredCommunities: qualifyingCommunities.size,
    largestCommunity: Math.max(...Array.from(communityStats.values()).map((s) => s.size)),
    optimizedNodes: nodes.length,
    optimizedEdges: edges.length,
    communityBreakdown,
  }

  console.log(`Optimized network: ${nodes.length} nodes, ${edges.length} edges`)
  console.log(`Final stats:`, stats)

  return { nodes, edges, stats }
}

function getContractName(address: string): string {
  const contractNames: Record<string, string> = {
    "0x937BEF10bA6Fb941ED84b8d249Abc76031429A9a": "Story NFT",
    "0x6e8f6E7fBAbDA86e2B614b53317FB9aB291Ec3c0": "Test Collection",
    "0xa02A5A4612E2C04d8E0354A31532f25Fa154Febd": "Test Collection Alt",
    "0x131A1FC90b6F962992808c70fD046F104f1D5126": "Test Collection 3",
    "0x88705D444044D544D1604df415BCeC17dce4290b": "Test Collection 4",
    "0x0A01ee213DDc78838730bD97f31e33ed336A2ABb": "Test Collection 5",
    "0xB950dB987c9D3C709c9F6D1b9bCea123F7dc2Ee9": "Test Collection 6",
    "0x0B0F1a64a257d2F9C2B2075Ed0dF0C8dea4edeE6": "Test Collection 7",
    "0xa25Cf552E493b6800772a91bBAA36bCA706f3681": "Free Collection",
    "0xe5b0A846D5779cc7565620Fb74c1E24aAf41e000": "Free Collection Alt",
    "0xa1119092ea911202E0a65B743a13AE28C5CF2f21": "MockERC721",
    "0x9692DAb9F998FF1AC3E9b3Ced219Cdd5E8867F1D": "Public Minting",
    "0x4A71B41983c8108aa249894d9d471b3C19EeEEB5": "Private Minting",
    "0x4709798FeA84C84ae2475fF0c25344115eE1529f": "IP Group NFT",
    "0x7F12C0A3EAC8333090f9aab27d8aE31BFFC26761": "Test Collection Main",
    "0x1A6d4CA39756746707622D4c153fbca9A38b4929": "Test Collection Secondary",
  }

  return contractNames[address] || `${address.substring(0, 8)}...`
}

export async function GET() {
  try {
    const networkData = await processOptimizedNetworkData()
    return NextResponse.json(networkData)
  } catch (error) {
    console.error("Error processing optimized network data:", error)
    return NextResponse.json({ error: "Failed to process optimized network data" }, { status: 500 })
  }
}
