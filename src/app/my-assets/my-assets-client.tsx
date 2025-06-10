"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@/contexts/wallet-context"
import { useFallbackWallet } from "@/contexts/fallback-wallet-context"
import { readAssets } from "@/lib/server-data"
import type { IPAsset } from "@/types"
import { formatTimestamp, getContractName } from "@/lib/data"
import Link from "next/link"
import { ExternalLink, Copy } from "lucide-react"

export function MyAssetsClient() {
  const tomoWallet = useWallet()
  const fallbackWallet = useFallbackWallet()

  // Use whichever wallet is connected
  const wallet = tomoWallet.isConnected ? tomoWallet : fallbackWallet
  const isConnected = tomoWallet.isConnected || fallbackWallet.isConnected
  const address = tomoWallet.address || fallbackWallet.address

  const [assets, setAssets] = useState<IPAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [userContracts, setUserContracts] = useState<string[]>([])

  useEffect(() => {
    if (isConnected && address) {
      loadUserAssets()
    }
  }, [isConnected, address])

  const loadUserAssets = async () => {
    setLoading(true)
    try {
      // In a real app, you'd fetch this from an API based on the connected wallet
      // For now, we'll simulate by filtering assets
      const allAssets = await readAssets()

      // For demo purposes, let's assume the user owns certain contracts
      // In reality, you'd check this on-chain or via an API
      const demoUserContracts = [
        "0x937BEF10bA6Fb941ED84b8d249Abc76031429A9a",
        "0x6e8f6E7fBAbDA86e2B614b53317FB9aB291Ec3c0",
      ]

      const userAssets = allAssets.filter((asset) => demoUserContracts.includes(asset.nftMetadata?.tokenContract || ""))

      setAssets(userAssets)
      setUserContracts(demoUserContracts)
    } catch (error) {
      console.error("Failed to load user assets:", error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="text-6xl mb-4">🔗</div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-4">
              Connect your wallet to view your IP assets and token contracts on Story Protocol.
            </p>
            <div className="bg-muted/30 p-4 rounded-lg border">
              <p className="text-sm text-muted-foreground">
                <strong>Network:</strong> Story Aeneid Testnet (Chain ID: 1315)
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>RPC:</strong> https://aeneid.storyrpc.io
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Supported:</strong> Tomo SDK, MetaMask, and other Web3 wallets
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const contractStats = userContracts.map((contract) => {
    const contractAssets = assets.filter((asset) => asset.nftMetadata?.tokenContract === contract)
    return {
      contract,
      name: getContractName(contract),
      assetCount: contractAssets.length,
      totalDescendants: contractAssets.reduce((sum, asset) => sum + (asset.descendantCount || 0), 0),
      assets: contractAssets,
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
          My Assets
        </h1>
        <p className="text-muted-foreground">View and manage your IP assets and token contracts on Story Protocol</p>
      </div>

      {/* Wallet Info */}
      <div className="asset-detail-card p-6">
        <h2 className="text-xl font-semibold mb-4">Wallet Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Connected Address</p>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm bg-muted p-2 rounded border break-all flex-1">{address}</p>
              <button
                onClick={() => copyToClipboard(address!)}
                className="p-2 hover:bg-muted rounded"
                title="Copy address"
              >
                <Copy className="w-4 h-4" />
              </button>
              <a
                href={`https://explorer.story.foundation/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-muted rounded"
                title="View on Story Explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Network</p>
            <p className="font-semibold">Story Aeneid Testnet</p>
            <p className="text-xs text-muted-foreground">Chain ID: 1315</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Wallet Provider</p>
            <p className="font-semibold">{tomoWallet.isConnected ? "Tomo SDK" : "MetaMask/Web3"}</p>
            <p className="text-xs text-muted-foreground">Multi-chain support</p>
          </div>
        </div>
      </div>

      {/* Contract Overview */}
      <div className="asset-detail-card p-6">
        <h2 className="text-xl font-semibold mb-4">Your Token Contracts</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your assets...</p>
          </div>
        ) : contractStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractStats.map((contract) => (
              <div key={contract.contract} className="bg-muted/30 rounded-lg p-4 border border-border">
                <h3 className="font-semibold mb-2">{contract.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs text-muted-foreground font-mono break-all flex-1">{contract.contract}</p>
                  <button
                    onClick={() => copyToClipboard(contract.contract)}
                    className="p-1 hover:bg-muted rounded"
                    title="Copy contract address"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Assets:</span>
                    <span className="font-semibold">{contract.assetCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Descendants:</span>
                    <span className="font-semibold">{contract.totalDescendants}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📄</div>
            <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
            <p className="text-muted-foreground">No token contracts associated with your wallet address.</p>
            <p className="text-sm text-muted-foreground mt-2">
              This is a demo showing sample contracts. In a real application, we would query the blockchain for your
              actual contracts.
            </p>
          </div>
        )}
      </div>

      {/* Assets List */}
      {assets.length > 0 && (
        <div className="asset-detail-card p-6">
          <h2 className="text-xl font-semibold mb-4">Your Assets ({assets.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Token ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Children
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {assets.slice(0, 50).map((asset) => (
                  <tr key={asset.ipId} className="table-row">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {asset.nftMetadata?.imageUrl && (
                          <img
                            src={asset.nftMetadata.imageUrl || "/placeholder.svg"}
                            alt={asset.nftMetadata.name}
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                            onError={(e) => {
                              e.currentTarget.style.display = "none"
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {asset.nftMetadata?.name || "Unnamed Asset"}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">{asset.ipId.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {getContractName(asset.nftMetadata?.tokenContract || "")}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{asset.nftMetadata?.tokenId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm text-foreground">{asset.childrenCount || 0}</span>
                        {asset.descendantCount > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">({asset.descendantCount} total)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {asset.blockTimestamp ? formatTimestamp(asset.blockTimestamp) : "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/asset/${encodeURIComponent(asset.ipId)}`} className="link-primary hover:underline">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {assets.length > 50 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Showing first 50 assets. Total: {assets.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
