"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { ethers } from "ethers"

// Define the Tomo wallet state interface based on actual SDK
interface TomoWalletState {
  isConnected: boolean
  address?: string
  evmProvider?: any
  chainId?: number | string
}

interface WalletContextType {
  isConnected: boolean
  address: string | null
  provider: ethers.BrowserProvider | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isLoading: boolean
  error: string | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

interface WalletProviderProps {
  children: React.ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tomoSDK, setTomoSDK] = useState<any>(null)

  // Initialize Tomo SDK
  useEffect(() => {
    const initTomo = async () => {
      try {
        if (typeof window === "undefined") return

        console.log("Initializing Tomo SDK...")

        // Dynamically import Tomo SDK
        const tomoModule = await import("@tomo-inc/tomo-web-sdk")
        console.log("Tomo module loaded:", tomoModule)

        // Extract the functions we need
        const { initTomoModal, getWalletState } = tomoModule

        if (!initTomoModal || !getWalletState) {
          throw new Error("Required Tomo SDK functions not found")
        }

        console.log("Initializing Tomo modal...")

        // Initialize Tomo Modal with proper configuration
        const tomoModal = initTomoModal({
          theme: "dark",
          clientId: process.env.NEXT_PUBLIC_TOMO_CLIENT_ID || "story-graph-demo",
          chainTypes: ["evm"],
          onConnect: (walletState: TomoWalletState) => {
            console.log("Tomo onConnect callback triggered:", walletState)
            handleTomoConnection(walletState)
          },
          onDisconnect: () => {
            console.log("Tomo onDisconnect callback triggered")
            handleTomoDisconnection()
          },
          onError: (error: any) => {
            console.error("Tomo onError callback:", error)
            setError(`Wallet error: ${error.message || error}`)
            setIsLoading(false)
          },
        })

        console.log("Tomo modal initialized:", tomoModal)

        // Store SDK references
        setTomoSDK({
          initTomoModal,
          getWalletState,
          tomoModal,
        })

        // Check if already connected
        try {
          const currentState = getWalletState()
          console.log("Current wallet state:", currentState)

          if (currentState && currentState.isConnected && currentState.address) {
            console.log("Auto-connecting to existing wallet session...")
            handleTomoConnection(currentState)
          }
        } catch (stateError) {
          console.warn("Could not get current wallet state:", stateError)
        }

        console.log("Tomo SDK initialization complete")
      } catch (error) {
        console.error("Failed to initialize Tomo SDK:", error)
        setError("Failed to initialize wallet SDK")
      }
    }

    initTomo()
  }, [])

  const handleTomoConnection = useCallback(async (walletState: TomoWalletState) => {
    try {
      console.log("Handling Tomo connection with state:", walletState)

      if (!walletState.evmProvider || !walletState.address) {
        throw new Error("Invalid wallet state: missing provider or address")
      }

      // Create ethers provider from Tomo's EVM provider
      const ethersProvider = new ethers.BrowserProvider(walletState.evmProvider)
      console.log("Created ethers provider:", ethersProvider)

      // Get the current network
      const network = await ethersProvider.getNetwork()
      console.log("Current network:", network)

      // Check if we're on Story Aeneid Testnet (1315)
      if (network.chainId !== BigInt(1315)) {
        console.log("Switching to Story Aeneid Testnet...")

        try {
          // Try to switch to Story Aeneid Testnet
          await ethersProvider.send("wallet_switchEthereumChain", [
            { chainId: "0x523" }, // 1315 in hex
          ])
        } catch (switchError: any) {
          console.log("Switch error:", switchError)

          // If the chain doesn't exist, add it
          if (switchError.code === 4902 || switchError.message?.includes("Unrecognized chain ID")) {
            console.log("Adding Story Aeneid Testnet to wallet...")

            await ethersProvider.send("wallet_addEthereumChain", [
              {
                chainId: "0x523", // 1315 in hex
                chainName: "Story Aeneid Testnet",
                nativeCurrency: {
                  name: "IP",
                  symbol: "IP",
                  decimals: 18,
                },
                rpcUrls: ["https://aeneid.storyrpc.io"],
                blockExplorerUrls: ["https://explorer.story.foundation"],
              },
            ])
          } else {
            throw switchError
          }
        }
      }

      // Verify the connection
      const accounts = await ethersProvider.listAccounts()
      console.log("Connected accounts:", accounts)

      if (accounts.length === 0) {
        throw new Error("No accounts found after connection")
      }

      // Set the connection state
      setProvider(ethersProvider)
      setAddress(walletState.address)
      setIsConnected(true)
      setError(null)
      setIsLoading(false)

      // Store connection state
      localStorage.setItem("wallet_connected", "true")
      localStorage.setItem("wallet_address", walletState.address)
      localStorage.setItem("wallet_provider", "tomo")

      console.log("Wallet connection successful!")
    } catch (error) {
      console.error("Error handling Tomo connection:", error)
      setError(`Failed to connect: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsLoading(false)
    }
  }, [])

  const handleTomoDisconnection = useCallback(() => {
    console.log("Handling Tomo disconnection")

    setIsConnected(false)
    setAddress(null)
    setProvider(null)
    setError(null)
    setIsLoading(false)

    // Clear stored connection state
    localStorage.removeItem("wallet_connected")
    localStorage.removeItem("wallet_address")
    localStorage.removeItem("wallet_provider")

    console.log("Wallet disconnected")
  }, [])

  const connectWallet = useCallback(async () => {
    console.log("Connect wallet requested")

    if (!tomoSDK) {
      const errorMsg = "Wallet SDK not initialized yet"
      console.error(errorMsg)
      setError(errorMsg)
      return
    }

    if (isLoading) {
      console.log("Connection already in progress")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log("Attempting to connect with Tomo SDK...")
      console.log("Available SDK methods:", Object.keys(tomoSDK))

      // Try different connection methods based on what's available
      if (tomoSDK.tomoModal) {
        console.log("Using tomoModal.connect()")

        if (typeof tomoSDK.tomoModal.connect === "function") {
          await tomoSDK.tomoModal.connect()
        } else if (typeof tomoSDK.tomoModal.open === "function") {
          await tomoSDK.tomoModal.open()
        } else {
          console.log("Available tomoModal methods:", Object.keys(tomoSDK.tomoModal))
          throw new Error("No connect method found on tomoModal")
        }
      } else {
        // Fallback: try global methods
        console.log("Trying global Tomo methods...")

        if (typeof window !== "undefined") {
          const globalTomo = (window as any).tomo || (window as any).TomoSDK

          if (globalTomo && typeof globalTomo.connect === "function") {
            await globalTomo.connect()
          } else if (typeof (window as any).openTomoConnectModal === "function") {
            ;(window as any).openTomoConnectModal()
          } else {
            throw new Error("No global Tomo connection method found")
          }
        } else {
          throw new Error("Window object not available")
        }
      }

      console.log("Connection request sent, waiting for callback...")

      // The actual connection will be handled by the onConnect callback
      // Don't set loading to false here, let the callback handle it
    } catch (error) {
      console.error("Failed to initiate wallet connection:", error)
      setError(`Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`)
      setIsLoading(false)
    }
  }, [tomoSDK, isLoading])

  const disconnectWallet = useCallback(async () => {
    console.log("Disconnect wallet requested")

    try {
      // Try to disconnect via Tomo SDK
      if (tomoSDK?.tomoModal?.disconnect) {
        console.log("Using tomoModal.disconnect()")
        await tomoSDK.tomoModal.disconnect()
      } else if (typeof window !== "undefined") {
        const globalTomo = (window as any).tomo || (window as any).TomoSDK
        if (globalTomo && typeof globalTomo.disconnect === "function") {
          console.log("Using global Tomo disconnect")
          await globalTomo.disconnect()
        }
      }

      // Always call our disconnection handler
      handleTomoDisconnection()
    } catch (error) {
      console.error("Error during disconnect:", error)
      // Force disconnect even if there's an error
      handleTomoDisconnection()
    }
  }, [tomoSDK, handleTomoDisconnection])

  // Auto-reconnect on page load
  useEffect(() => {
    const wasConnected = localStorage.getItem("wallet_connected")
    const storedAddress = localStorage.getItem("wallet_address")
    const storedProvider = localStorage.getItem("wallet_provider")

    if (wasConnected && storedAddress && storedProvider === "tomo" && tomoSDK) {
      console.log("Attempting auto-reconnect...")

      try {
        const walletState = tomoSDK.getWalletState()
        console.log("Auto-reconnect wallet state:", walletState)

        if (walletState && walletState.isConnected && walletState.address === storedAddress) {
          console.log("Auto-reconnecting to stored wallet...")
          handleTomoConnection(walletState)
        } else {
          console.log("Stored wallet state doesn't match, clearing...")
          localStorage.removeItem("wallet_connected")
          localStorage.removeItem("wallet_address")
          localStorage.removeItem("wallet_provider")
        }
      } catch (error) {
        console.warn("Auto-reconnect failed:", error)
        localStorage.removeItem("wallet_connected")
        localStorage.removeItem("wallet_address")
        localStorage.removeItem("wallet_provider")
      }
    }
  }, [tomoSDK, handleTomoConnection])

  const value: WalletContextType = {
    isConnected,
    address,
    provider,
    connectWallet,
    disconnectWallet,
    isLoading,
    error,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
