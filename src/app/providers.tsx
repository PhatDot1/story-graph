"use client"

import type React from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { WagmiProvider } from 'wagmi'
import { getDefaultConfig, TomoEVMKitProvider } from '@tomo-inc/tomo-evm-kit'
import { metaMaskWallet, walletConnectWallet } from '@tomo-inc/tomo-evm-kit/wallets'
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains'
import { TomoWalletProvider } from "@/contexts/tomo-wallet-context"
import { FallbackWalletProvider } from "@/contexts/fallback-wallet-context"

// Story Aeneid Testnet configuration
const storyAeneidTestnet = {
  id: 1315,
  name: 'Story Aeneid Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'IP',
    symbol: 'IP',
  },
  rpcUrls: {
    default: {
      http: ['https://aeneid.storyrpc.io'],
    },
    public: {
      http: ['https://aeneid.storyrpc.io'],
    },
  },
  blockExplorers: {
    default: { name: 'Story Explorer', url: 'https://explorer.story.foundation' },
  },
  testnet: true,
} as const

const config = getDefaultConfig({
  clientId: process.env.NEXT_PUBLIC_TOMO_CLIENT_ID || 'WpOdScO5S8LMj4Hi8vwrQ0KSKQtP1pI6OcTM3If1f5bxAkRZQdivbATx7TDjfo8EGQ8JRk4Ht8MqpWzjb7C1wRhY',
  appName: 'Story Graph - IP Asset Management',
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || 'bf78bba70a5a187c80781fea455d093f',
  chains: [storyAeneidTestnet, mainnet, polygon, optimism, arbitrum, base],
  ssr: true,
  wallets: [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
      ],
    },
  ],
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <TomoEVMKitProvider>
          <TomoWalletProvider>
            <FallbackWalletProvider>
              {children}
            </FallbackWalletProvider>
          </TomoWalletProvider>
        </TomoEVMKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
