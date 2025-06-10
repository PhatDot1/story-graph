"use client"

import { useTomoWallet } from "@/contexts/tomo-wallet-context"
import { useFallbackWallet } from "@/contexts/fallback-wallet-context"
import { Wallet, LogOut, AlertCircle, ExternalLink, Loader2, CheckCircle, Info, AlertTriangle } from 'lucide-react'

export function WalletConnect() {
  const tomoWallet = useTomoWallet()
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
      console.log("Attempting Tomo EVM Kit connection...")
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
    const isTomoConnected = tomoWallet.isConnected
    const showChainWarning = isTomoConnected && !tomoWallet.isCorrectChain

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm font-mono">{formatAddress(wallet.address)}</span>
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded">
              {isTomoConnected ? "Tomo" : "Web3"}
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

        {/* Chain warning for Tomo wallet */}
        {showChainWarning && (
          <div className="flex items-center gap-2 text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">Wrong network. </span>
            <button
              onClick={tomoWallet.switchToStoryChain}
              disabled={tomoWallet.isLoading}
              className="text-xs underline hover:no-underline"
            >
              Switch to Story
            </button>
          </div>
        )}

        <div className="text-xs text-muted-foreground text-right">
          <div>
            {isTomoConnected ? "Tomo EVM Kit" : "MetaMask Fallback"} • Chain: {tomoWallet.chainId || "Unknown"}
          </div>
          <div>Story Protocol (Target: 1315)</div>
        </div>
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
          <div>Tomo EVM Kit + MetaMask Fallback</div>
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
        <div>Tomo EVM Kit + MetaMask Fallback</div>
        <div>Story Protocol (Chain ID: 1315)</div>
      </div>
    </div>
  )
}
