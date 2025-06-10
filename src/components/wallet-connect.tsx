"use client"

import { useWallet } from "@/contexts/wallet-context"
import { useFallbackWallet } from "@/contexts/fallback-wallet-context"
import { Wallet, LogOut, AlertCircle, ExternalLink, Loader2, CheckCircle, Info } from "lucide-react"

export function WalletConnect() {
  const tomoWallet = useWallet()
  const fallbackWallet = useFallbackWallet()

  // Use Tomo wallet if connected, otherwise use fallback
  const wallet = tomoWallet.isConnected ? tomoWallet : fallbackWallet

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
  }

  const handleConnect = async () => {
    console.log("Wallet connect button clicked")

    // Always try Tomo first
    try {
      console.log("Attempting Tomo connection...")
      await tomoWallet.connectWallet()
    } catch (error) {
      console.warn("Tomo connection failed, trying fallback:", error)

      // Only try fallback if Tomo completely fails
      try {
        await fallbackWallet.connectWallet()
      } catch (fallbackError) {
        console.error("Both Tomo and fallback failed:", fallbackError)
      }
    }
  }

  // Show connection status
  if (wallet.isConnected && wallet.address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm font-mono">{formatAddress(wallet.address)}</span>
          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
            {tomoWallet.isConnected ? "Tomo" : "Web3"}
          </span>
        </div>
        <a
          href={`https://explorer.story.foundation/address/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors p-2 hover:bg-muted/50 rounded"
          title="View on Story Explorer"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <button
          onClick={wallet.disconnectWallet}
          className="flex items-center gap-2 bg-secondary hover:bg-secondary/80 rounded-lg px-3 py-2 text-sm transition-colors"
          title="Disconnect Wallet"
        >
          <LogOut className="w-4 h-4" />
          Disconnect
        </button>
      </div>
    )
  }

  // Show loading state
  if (wallet.isLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm">Connecting...</span>
        </div>
        <div className="text-xs text-muted-foreground">Check your wallet for connection request</div>
      </div>
    )
  }

  // Show error state
  if (tomoWallet.error || fallbackWallet.error) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs">{tomoWallet.error || fallbackWallet.error}</span>
          </div>
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Wallet className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          <div>Tomo SDK + MetaMask Fallback</div>
          <div>Story Protocol (Chain ID: 1315)</div>
        </div>
      </div>
    )
  }

  // Show connect button
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-blue-400 text-sm bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
          <Info className="w-4 h-4" />
          <span className="text-xs">Ready to connect</span>
        </div>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 btn-primary px-4 py-2 rounded-lg text-sm transition-colors hover:scale-105 transform"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
      </div>
      <div className="text-xs text-muted-foreground text-right">
        <div>Tomo SDK + MetaMask Fallback</div>
        <div>Story Protocol (Chain ID: 1315)</div>
      </div>
    </div>
  )
}
