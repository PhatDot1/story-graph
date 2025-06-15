import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { IPAsset } from "@/types"

interface ProcessedData {
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
    largestCommunity: number
  }
}

async function processNetworkDataServer(): Promise<ProcessedData> {
  const filePath = path.join(process.cwd(), "assets-reduced.ndjson")

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

  console.log(`Processing ${assets.length} assets for network visualization`)

  // Group assets by token contract
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

  // Create community mapping
  const communityMap = new Map<string, number>()
  let communityId = 0

  contractGroups.forEach((_, contract) => {
    communityMap.set(contract, communityId++)
  })

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
    "#8b5cf6",
    "#06b6d4",
  ]

  const nodes: ProcessedData["nodes"] = []
  const edges: ProcessedData["edges"] = []
  const edgeSet = new Set<string>()

  // Strategy 1: For large contracts (>100 assets), create a single representative node
  // Strategy 2: For medium contracts (10-100 assets), show top-level assets only
  // Strategy 3: For small contracts (<10 assets), show all assets

  contractGroups.forEach((contractAssets, contract) => {
    const community = communityMap.get(contract) || 0
    const color = colors[community % colors.length]

    if (contractAssets.length > 100) {
      // Large contract: Create a single group node
      const totalDescendants = contractAssets.reduce((sum, asset) => sum + (asset.descendantCount || 0), 0)
      const totalChildren = contractAssets.reduce((sum, asset) => sum + (asset.childrenCount || 0), 0)

      nodes.push({
        id: `group_${contract}`,
        label: getContractName(contract),
        size: Math.min(100, 40 + Math.log(contractAssets.length) * 10),
        community,
        color,
        descendantCount: totalDescendants,
        childrenCount: totalChildren,
        isGroup: true,
        tokenContract: contract,
        assetCount: contractAssets.length,
      })
    } else if (contractAssets.length > 10) {
      // Medium contract: Show only root assets and highly connected assets
      const importantAssets = contractAssets
        .filter(
          (asset) => rootAssets.has(asset.ipId) || (asset.descendantCount || 0) > 5 || (asset.childrenCount || 0) > 3,
        )
        .slice(0, 20) // Limit to 20 most important assets

      importantAssets.forEach((asset) => {
        nodes.push({
          id: asset.ipId,
          label: asset.nftMetadata?.name?.substring(0, 20) || asset.ipId.substring(0, 8),
          size: Math.max(20, Math.min(60, 20 + (asset.descendantCount || 0) * 2)),
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
      // Small contract: Show all assets
      contractAssets.forEach((asset) => {
        nodes.push({
          id: asset.ipId,
          label: asset.nftMetadata?.name?.substring(0, 20) || asset.ipId.substring(0, 8),
          size: Math.max(15, Math.min(40, 15 + (asset.descendantCount || 0) * 3)),
          community,
          color,
          descendantCount: asset.descendantCount || 0,
          childrenCount: asset.childrenCount || 0,
          isGroup: false,
          tokenContract: contract,
        })
      })

      // Create edges for small contracts
      contractAssets.forEach((asset) => {
        if (asset.rootIpIds) {
          asset.rootIpIds.forEach((rootId) => {
            if (contractAssets.some((a) => a.ipId === rootId)) {
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

  // Create inter-contract connections for related assets
  const maxInterConnections = 50 // Limit inter-contract connections
  let interConnectionCount = 0

  assets.forEach((asset) => {
    if (interConnectionCount >= maxInterConnections) return

    if (asset.rootIpIds) {
      asset.rootIpIds.forEach((rootId) => {
        const rootAsset = assets.find((a) => a.ipId === rootId)
        if (
          rootAsset &&
          rootAsset.nftMetadata?.tokenContract !== asset.nftMetadata?.tokenContract &&
          nodes.some((n) => n.id === rootId || n.id === `group_${rootAsset.nftMetadata?.tokenContract}`) &&
          nodes.some((n) => n.id === asset.ipId || n.id === `group_${asset.nftMetadata?.tokenContract}`)
        ) {
          const sourceId = nodes.find((n) => n.id === rootId) ? rootId : `group_${rootAsset.nftMetadata?.tokenContract}`
          const targetId = nodes.find((n) => n.id === asset.ipId)
            ? asset.ipId
            : `group_${asset.nftMetadata?.tokenContract}`

          const edgeId = `${sourceId}-${targetId}`
          if (!edgeSet.has(edgeId)) {
            edges.push({
              id: edgeId,
              source: sourceId,
              target: targetId,
              weight: 3,
              type: "cross-contract",
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
    totalCommunities: communityId,
    largestCommunity: Math.max(...Array.from(contractGroups.values()).map((group) => group.length)),
  }

  console.log(`Processed network: ${nodes.length} nodes, ${edges.length} edges`)
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
    const networkData = await processNetworkDataServer()
    return NextResponse.json(networkData)
  } catch (error) {
    console.error("Error processing network data:", error)
    return NextResponse.json({ error: "Failed to process network data" }, { status: 500 })
  }
}
