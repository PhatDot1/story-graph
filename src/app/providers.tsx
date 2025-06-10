"use client"

import type React from "react"

import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { WalletProvider } from "@/contexts/wallet-context"
import { FallbackWalletProvider } from "@/contexts/fallback-wallet-context"
import { TomoProvider } from "@/components/tomo-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TomoProvider>
        <WalletProvider>
          <FallbackWalletProvider>{children}</FallbackWalletProvider>
        </WalletProvider>
      </TomoProvider>
    </QueryClientProvider>
  )
}
