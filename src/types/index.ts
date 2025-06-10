export interface IPAsset {
  id: string
  ipId: string
  descendantCount: number
  ancestorCount: number
  rootIpIds: string[]
  blockNumber: string
  blockTimestamp: string
  childrenCount: number
  parentCount: number
  isGroup: boolean
  transactionHash: string
  nftMetadata: {
    name: string
    chainId: string
    tokenContract: string
    tokenId: string
    tokenUri: string
    imageUrl: string
  }
  latestArbitrationPolicy: string
  rootCount: number
}

export interface NetworkNode {
  id: string
  label: string
  size?: number
  community?: number
  color?: string
  descendantCount?: number
  childrenCount?: number
  isGroup?: boolean
  tokenContract?: string
}

export interface NetworkEdge {
  id: string
  source: string
  target: string
  weight?: number
  type?: string
}

export interface NetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}
