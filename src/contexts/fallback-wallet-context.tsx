"use client"

import type React from "react"

import { createContext, useContext, useState, useCallback } from "react"
import { ethers } from "ethers"

interface FallbackWalletContextType {
  isConnected: boolean
  address: string | null
  provider: ethers.BrowserProvider | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isLoading: boolean
  error: string | null
}

const FallbackWalletContext = createContext<FallbackWalletContextType | undefined>(undefined)

export function useFallbackWallet() {
  const context = useContext(FallbackWalletContext)
  if (context === undefined) {
    throw new Error("useFallbackWallet must be used within a FallbackWalletProvider")
  }
  return context
}

interface FallbackWalletProviderProps {
  children: React.ReactNode
}

export function FallbackWalletProvider({ children }: FallbackWalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connectWallet = useCallback(async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      setError("No wallet detected. Please install MetaMask or another Web3 wallet.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const ethereum = (window as any).ethereum
      const provider = new ethers.BrowserProvider(ethereum)

      // Request account access
      await ethereum.request({ method: "eth_requestAccounts" })

      // Switch to Story Aeneid Testnet
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x523" }], // 1315 in hex
        })
      } catch (switchError: any) {
        // If the chain doesn't exist, add it
        if (switchError.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x523",
                chainName: "Story Aeneid Testnet",
                nativeCurrency: {
                  name: "IP",
                  symbol: "IP",
                  decimals: 18,
                },
                rpcUrls: ["https://aeneid.storyrpc.io"],
                blockExplorerUrls: ["https://explorer.story.foundation"],
              },
            ],
          })
        }
      }

      const accounts = await provider.listAccounts()
      if (accounts.length > 0) {
        setProvider(provider)
        setAddress(accounts[0].address)
        setIsConnected(true)

        // Store connection state
        localStorage.setItem("wallet_connected", "true")
        localStorage.setItem("wallet_address", accounts[0].address)
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      setError("Failed to connect wallet")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const disconnectWallet = useCallback(() => {
    setIsConnected(false)
    setAddress(null)
    setProvider(null)
    setError(null)

    // Clear stored connection state
    localStorage.removeItem("wallet_connected")
    localStorage.removeItem("wallet_address")
  }, [])

  const value: FallbackWalletContextType = {
    isConnected,
    address,
    provider,
    connectWallet,
    disconnectWallet,
    isLoading,
    error,
  }

  return <FallbackWalletContext.Provider value={value}>{children}</FallbackWalletContext.Provider>
}
