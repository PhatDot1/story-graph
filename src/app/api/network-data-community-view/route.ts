import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { IPAsset } from "@/types"

interface CommunityViewData {
  nodes: Array<{
    id: string
    label: string
    size: number
    assetCount: number
    color: string
    brightness: number
    tokenContract: string
    hasConnections: boolean
    avgConnections: number
    topAssets: Array<{
      name: string
      ipId: string
      descendantCount: number
    }>
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    weight: number
    connectionCount: number
    type: string
  }>
  stats: {
    totalAssets: number
    totalContracts: number
    visibleCommunities: number
    totalConnections: number
    largestCommunity: number
    communityBreakdown: {
      large: number
      medium: number
      small: number
      tiny: number
    }
  }
}

async function processCommunityViewData(): Promise<CommunityViewData> {
  const filePath = path.join(process.cwd(), "assets-reduced.ndjson")

  if (!fs.existsSync(filePath)) {
    throw new Error("Assets file not found")
  }

  const fileContent = await fs.promises.readFile(filePath, "utf-8")
  const lines = fileContent.split("\n").filter((line: string) => line.trim() !== "")

  const assets: IPAsset[] = lines
    .map((line: string, index: number) => {
      try {
        return JSON.parse(line)
      } catch (parseError) {
        console.error(`Error parsing line ${index + 1}:`, parseError)
        return null
      }
    })
    .filter(Boolean) as IPAsset[]

  console.log(`Processing ${assets.length} assets for community view`)

  // Group assets by token contract (communities)
  const contractGroups = new Map<string, IPAsset[]>()

  assets.forEach((asset) => {
    const contract = asset.nftMetadata?.tokenContract || "unknown"
    if (!contractGroups.has(contract)) {
      contractGroups.set(contract, [])
    }
    contractGroups.get(contract)!.push(asset)
  })

  // Filter communities (minimum 5 assets)
  const MIN_COMMUNITY_SIZE = 5
  const qualifyingCommunities = Array.from(contractGroups.entries()).filter(
    ([_, assets]) => assets.length >= MIN_COMMUNITY_SIZE,
  )

  console.log(`Qualifying communities: ${qualifyingCommunities.length} out of ${contractGroups.size}`)

  // Community breakdown
  const communityBreakdown = { large: 0, medium: 0, small: 0, tiny: 0 }
  qualifyingCommunities.forEach(([_, assets]) => {
    const size = assets.length
    if (size >= 100) communityBreakdown.large++
    else if (size >= 20) communityBreakdown.medium++
    else if (size >= 10) communityBreakdown.small++
    else communityBreakdown.tiny++
  })

  // Color palette
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
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#ec4899",
  ]

  // Create community nodes
  const nodes: CommunityViewData["nodes"] = []
  const communityMap = new Map<string, number>()

  qualifyingCommunities.forEach(([contract, contractAssets], index) => {
    const assetCount = contractAssets.length

    // Calculate size (logarithmic scale for better visualization)
    const minSize = 30
    const maxSize = 120
    const size = Math.min(maxSize, minSize + Math.log(assetCount) * 15)

    // Calculate brightness (0.4 to 1.0 based on asset count)
    const maxAssets = Math.max(...qualifyingCommunities.map(([_, assets]) => assets.length))
    const brightness = 0.4 + (assetCount / maxAssets) * 0.6

    // Calculate connections within community
    let totalConnections = 0
    contractAssets.forEach((asset) => {
      // Count connections to other assets in the same community
      const connections = asset.rootIpIds.filter((rootId) => contractAssets.some((a) => a.ipId === rootId)).length
      totalConnections += connections
    })

    const avgConnections = contractAssets.length > 0 ? totalConnections / contractAssets.length : 0
    const hasConnections = totalConnections > 0

    // Get top assets by descendant count
    const topAssets = contractAssets
      .sort((a, b) => (b.descendantCount || 0) - (a.descendantCount || 0))
      .slice(0, 5)
      .map((asset) => ({
        name: asset.nftMetadata?.name || "Unnamed Asset",
        ipId: asset.ipId,
        descendantCount: asset.descendantCount || 0,
      }))

    communityMap.set(contract, index)

    nodes.push({
      id: `community_${index}`,
      label: getContractName(contract),
      size,
      assetCount,
      color: colors[index % colors.length],
      brightness,
      tokenContract: contract,
      hasConnections,
      avgConnections,
      topAssets,
    })
  })

  // Create edges between communities based on cross-community connections
  const edges: CommunityViewData["edges"] = []
  const edgeMap = new Map<string, number>()

  assets.forEach((asset) => {
    const assetContract = asset.nftMetadata?.tokenContract || "unknown"
    const assetCommunityIndex = communityMap.get(assetContract)

    if (assetCommunityIndex === undefined) return

    if (asset.rootIpIds) {
      asset.rootIpIds.forEach((rootId) => {
        const rootAsset = assets.find((a) => a.ipId === rootId)
        if (!rootAsset) return

        const rootContract = rootAsset.nftMetadata?.tokenContract || "unknown"
        const rootCommunityIndex = communityMap.get(rootContract)

        if (rootCommunityIndex === undefined || rootCommunityIndex === assetCommunityIndex) return

        // Cross-community connection found
        const sourceId = `community_${rootCommunityIndex}`
        const targetId = `community_${assetCommunityIndex}`
        const edgeKey = `${Math.min(rootCommunityIndex, assetCommunityIndex)}-${Math.max(rootCommunityIndex, assetCommunityIndex)}`

        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, 0)
        }
        edgeMap.set(edgeKey, edgeMap.get(edgeKey)! + 1)
      })
    }
  })

  // Convert edge map to edges array
  edgeMap.forEach((connectionCount, edgeKey) => {
    const [sourceIndex, targetIndex] = edgeKey.split("-").map(Number)
    const sourceId = `community_${sourceIndex}`
    const targetId = `community_${targetIndex}`

    // Weight based on connection count (logarithmic scale)
    const weight = Math.min(10, 2 + Math.log(connectionCount) * 2)

    edges.push({
      id: `${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      weight,
      connectionCount,
      type: "cross-community",
    })
  })

  const stats = {
    totalAssets: assets.length,
    totalContracts: contractGroups.size,
    visibleCommunities: qualifyingCommunities.length,
    totalConnections: edges.length,
    largestCommunity: Math.max(...qualifyingCommunities.map(([_, assets]) => assets.length)),
    communityBreakdown,
  }

  console.log(`Community view: ${nodes.length} communities, ${edges.length} connections`)
  console.log(`Stats:`, stats)

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
    const networkData = await processCommunityViewData()
    return NextResponse.json(networkData)
  } catch (error) {
    console.error("Error processing community view data:", error)
    return NextResponse.json({ error: "Failed to process community view data" }, { status: 500 })
  }
}
