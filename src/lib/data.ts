import type { IPAsset, NetworkData, NetworkNode, NetworkEdge } from "@/types"

// Function to prepare network data for visualization
export function prepareNetworkData(assets: IPAsset[]): NetworkData {
  const nodes: NetworkNode[] = []
  const edges: NetworkEdge[] = []
  const edgeMap = new Map<string, boolean>()

  // Create a map for quick lookup
  const assetMap = new Map<string, IPAsset>()
  assets.forEach((asset) => {
    assetMap.set(asset.ipId, asset)
  })

  // Assign communities based on token contracts and relationships
  const communities = assignCommunities(assets)

  // Create nodes
  assets.forEach((asset) => {
    const community = communities.get(asset.ipId) || 0

    nodes.push({
      id: asset.ipId,
      label: asset.nftMetadata?.name || asset.ipId.substring(0, 8) || "Unknown",
      size: Math.max(20, Math.min(80, 20 + (asset.descendantCount || 0) * 5 + (asset.childrenCount || 0) * 3)),
      community: community,
      color: getCommunityColor(community),
      descendantCount: asset.descendantCount || 0,
      childrenCount: asset.childrenCount || 0,
      isGroup: asset.isGroup || false,
      tokenContract: asset.nftMetadata?.tokenContract,
    })

    // Create edges based on root relationships
    asset.rootIpIds.forEach((rootId) => {
      if (assetMap.has(rootId)) {
        const edgeId = `${rootId}-${asset.ipId}`
        if (!edgeMap.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: rootId,
            target: asset.ipId,
            weight: 2,
            type: "parent-child",
          })
          edgeMap.set(edgeId, true)
        }
      }
    })

    // Create edges for direct parent relationships if different from root
    if (asset.parentCount > 0 && asset.rootIpIds.length === 0) {
      // This is a root node, look for its children
      const children = assets.filter((a) => a.rootIpIds.includes(asset.ipId))
      children.forEach((child) => {
        const edgeId = `${asset.ipId}-${child.ipId}`
        if (!edgeMap.has(edgeId)) {
          edges.push({
            id: edgeId,
            source: asset.ipId,
            target: child.ipId,
            weight: 2,
            type: "parent-child",
          })
          edgeMap.set(edgeId, true)
        }
      })
    }
  })

  return { nodes, edges }
}

// Enhanced community detection based on token contracts and relationships
function assignCommunities(assets: IPAsset[]): Map<string, number> {
  const communities = new Map<string, number>()
  const contractToCommunity = new Map<string, number>()
  let currentCommunity = 0

  // Group by token contract first
  assets.forEach((asset) => {
    const contract = asset.nftMetadata?.tokenContract
    if (contract && !contractToCommunity.has(contract)) {
      contractToCommunity.set(contract, currentCommunity)
      currentCommunity++
    }
  })

  // Assign communities based on contracts
  assets.forEach((asset) => {
    const contract = asset.nftMetadata?.tokenContract
    if (contract && contractToCommunity.has(contract)) {
      communities.set(asset.ipId, contractToCommunity.get(contract)!)
    } else {
      communities.set(asset.ipId, 0)
    }
  })

  return communities
}

// Enhanced color palette for communities
function getCommunityColor(communityId: number): string {
  const colors = [
    "#8b5cf6", // purple (primary)
    "#06b6d4", // cyan
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#ec4899", // pink
    "#84cc16", // lime
    "#6366f1", // indigo
    "#f97316", // orange
    "#14b8a6", // teal
    "#8b5cf6", // purple variant
    "#06b6d4", // cyan variant
    "#10b981", // emerald variant
    "#f59e0b", // amber variant
    "#ef4444", // red variant
  ]

  return colors[communityId % colors.length]
}

// Helper function to format timestamp
export function formatTimestamp(timestamp: string): string {
  return new Date(Number.parseInt(timestamp) * 1000).toLocaleDateString()
}

// Helper function to get contract name from address
export function getContractName(address: string): string {
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

// Get community statistics
export function getCommunityStats(assets: IPAsset[]): Record<string, { count: number; name: string; color: string }> {
  const stats: Record<string, { count: number; name: string; color: string }> = {}
  const contractToCommunity = new Map<string, number>()
  let currentCommunity = 0

  // Build contract to community mapping
  assets.forEach((asset) => {
    const contract = asset.nftMetadata?.tokenContract
    if (contract && !contractToCommunity.has(contract)) {
      contractToCommunity.set(contract, currentCommunity)
      currentCommunity++
    }
  })

  // Calculate stats
  assets.forEach((asset) => {
    const contract = asset.nftMetadata?.tokenContract
    const community = contract ? contractToCommunity.get(contract) || 0 : 0
    const communityKey = community.toString()

    if (!stats[communityKey]) {
      stats[communityKey] = {
        count: 0,
        name: contract ? getContractName(contract) : "Unknown",
        color: getCommunityColor(community),
      }
    }
    stats[communityKey].count++
  })

  return stats
}
