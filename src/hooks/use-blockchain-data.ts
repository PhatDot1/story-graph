// hooks/use-blockchain-data.ts
"use client"

import { useQuery } from "@tanstack/react-query"

export interface BlockchainAssetData {
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

export function useBlockchainData(
    tokenContract: string,
    tokenId: string
  ) {
    return useQuery({
      queryKey: ["blockchain-data", tokenContract, tokenId],
      queryFn: async (): Promise<BlockchainAssetData> => {
        if (!tokenContract || !tokenId) {
          throw new Error("Missing tokenContract or tokenId")
        }
        const params = new URLSearchParams({ contract: tokenContract, tokenId })
        const res = await fetch(`/api/asset/${tokenId}?${params}`)
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Error ${res.status}: ${text}`)
        }
        return res.json()
      },
      enabled: Boolean(tokenContract && tokenId),
      staleTime: 1000 * 60 * 5,
      retry: 2,
    })
  }
