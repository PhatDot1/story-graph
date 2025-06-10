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
      filteredCommunities?: number
      largestCommunity: number
      optimizedNodes?: number
      optimizedEdges?: number
    }
  }
  
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
  
  export async function processNetworkData(): Promise<ProcessedData> {
    // This function should only be called from the API route
    throw new Error("processNetworkData should only be called server-side via API route")
  }
  
  // Client-side function to fetch processed data (full dataset)
  export async function fetchNetworkData(): Promise<ProcessedData> {
    const response = await fetch("/api/network-data")
    if (!response.ok) {
      throw new Error("Failed to fetch network data")
    }
    return response.json()
  }
  
  // Client-side function to fetch optimized data (filtered dataset)
  export async function fetchOptimizedNetworkData(): Promise<ProcessedData> {
    const response = await fetch("/api/network-data-optimized")
    if (!response.ok) {
      throw new Error("Failed to fetch optimized network data")
    }
    return response.json()
  }
  
  // Client-side function to fetch community view data (blob visualization)
  export async function fetchCommunityViewData(): Promise<CommunityViewData> {
    const response = await fetch("/api/network-data-community-view")
    if (!response.ok) {
      throw new Error("Failed to fetch community view data")
    }
    return response.json()
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
  