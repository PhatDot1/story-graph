"use client"
import { useQuery } from "@tanstack/react-query"

interface BlockchainAssetData {
  ipId: string
  nftOwner: string | null
  metadataUri: string | null
  portalUrl: string
  explorerUrl: string
  derivativeCount: number
  disputeCount: number
  licenseCount: string
  licenseTerms: {
    template: string | null
    termsId: string | null
    decodedTerms: any | null
  }
  coreMetadata: any | null
  jsonMetadata: string | null
  royaltyVault: string
  wipBalance: number
  error?: string
}

export function useBlockchainData(ipId: string, tokenContract?: string, tokenId?: string) {
  return useQuery({
    queryKey: ["blockchain-data", ipId, tokenContract, tokenId],
    queryFn: async (): Promise<BlockchainAssetData> => {
      if (!tokenContract || !tokenId) {
        throw new Error("Missing tokenContract or tokenId")
      }

      const params = new URLSearchParams({
        tokenContract,
        tokenId,
      })

      const response = await fetch(`/api/asset/${ipId}?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch blockchain data")
      }

      return response.json()
    },
    enabled: Boolean(ipId && tokenContract && tokenId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  })
}
