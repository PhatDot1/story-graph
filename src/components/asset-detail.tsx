"use client"

import type React from "react"

import Link from "next/link"
import type { IPAsset } from "@/types"
import { formatTimestamp, getContractName } from "@/lib/data"
import { useBlockchainData } from "@/hooks/use-blockchain-data"
import { ExternalLink, Copy, AlertCircle, CheckCircle, Clock, Users, Shield, Coins } from "lucide-react"

interface AssetDetailProps {
  asset: IPAsset
  relatedAssets: IPAsset[]
}

export function AssetDetail({ asset, relatedAssets }: AssetDetailProps) {
  const {
    data: blockchainData,
    isLoading: isBlockchainLoading,
    error: blockchainError,
  } = useBlockchainData(asset.ipId, asset.nftMetadata?.tokenContract, asset.nftMetadata?.tokenId)

  // Find assets that share the same root or are in the same collection
  const sameRootAssets = relatedAssets.filter(
    (a) =>
      a.ipId !== asset.ipId &&
      (asset.rootIpIds.some((rootId) => a.rootIpIds.includes(rootId)) ||
        a.rootIpIds.includes(asset.ipId) ||
        asset.rootIpIds.includes(a.ipId) ||
        (asset.nftMetadata?.tokenContract && a.nftMetadata?.tokenContract === asset.nftMetadata.tokenContract)),
  )

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = "/placeholder.svg?height=256&width=256&text=No+Image"
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatLicenseTerms = (terms: any) => {
    if (!terms || !Array.isArray(terms)) return null

    return {
      transferable: terms[0],
      royaltyPolicy: terms[1],
      defaultMintingFee: terms[2]?.toString(),
      expiration: terms[3]?.toString(),
      commercialUse: terms[4],
      commercialAttribution: terms[5],
      commercializerChecker: terms[6],
      commercializerCheckerData: terms[7],
      commercialRevShare: terms[8],
      commercialRevCeiling: terms[9]?.toString(),
      derivativesAllowed: terms[10],
      derivativesAttribution: terms[11],
      derivativesApproval: terms[12],
      derivativesReciprocal: terms[13],
      derivativeRevCeiling: terms[14],
      currency: terms[15]?.toString(),
      uri: terms[16],
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent mb-2">
            {asset.nftMetadata?.name || "Unnamed Asset"}
          </h1>
          <p className="text-muted-foreground">
            {asset.nftMetadata?.tokenContract ? getContractName(asset.nftMetadata.tokenContract) : "Unknown Collection"}
          </p>
        </div>
        <div className="flex gap-2">
          {blockchainData && (
            <>
              <a
                href={blockchainData.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-4 py-2 rounded-md text-sm flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Story Portal
              </a>
              <a
                href={blockchainData.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-4 py-2 rounded-md text-sm flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Explorer
              </a>
            </>
          )}
          <Link href="/" className="btn-secondary px-4 py-2 rounded-md text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Blockchain Status */}
      <div className="asset-detail-card p-4">
        <div className="flex items-center gap-3">
          {isBlockchainLoading ? (
            <>
              <Clock className="w-5 h-5 text-yellow-500 animate-spin" />
              <span className="text-sm">Loading blockchain data...</span>
            </>
          ) : blockchainError ? (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm text-red-400">Failed to load blockchain data</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-400">Blockchain data loaded successfully</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Asset Image */}
        <div className="lg:col-span-1">
          <div className="asset-detail-card p-6">
            <h3 className="text-lg font-semibold mb-4">Asset Preview</h3>
            {asset.nftMetadata?.imageUrl && asset.nftMetadata.imageUrl.trim() !== "" ? (
              <img
                src={asset.nftMetadata.imageUrl || "/placeholder.svg"}
                alt={asset.nftMetadata.name || "Asset image"}
                className="w-full h-64 object-cover rounded-lg border border-border"
                onError={handleImageError}
              />
            ) : (
              <div className="w-full h-64 bg-muted rounded-lg flex items-center justify-center border border-border">
                <div className="text-center">
                  <div className="text-4xl mb-2">🖼️</div>
                  <span className="text-muted-foreground">No Image Available</span>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-2">
              {asset.nftMetadata?.tokenUri && asset.nftMetadata.tokenUri.trim() !== "" && (
                <a
                  href={asset.nftMetadata.tokenUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary w-full text-center py-2 rounded-md text-sm flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Metadata
                </a>
              )}
              {blockchainData?.metadataUri &&
                blockchainData.metadataUri.trim() !== "" &&
                blockchainData.metadataUri !== asset.nftMetadata?.tokenUri && (
                  <a
                    href={blockchainData.metadataUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full text-center py-2 rounded-md text-sm flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Blockchain Metadata
                  </a>
                )}
            </div>
          </div>
        </div>

        {/* Asset Information */}
        <div className="lg:col-span-2">
          <div className="asset-detail-card p-6">
            <h2 className="text-xl font-semibold mb-6 text-foreground">Asset Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">IP ID</dt>
                  <dd className="text-sm text-foreground font-mono bg-muted p-2 rounded border break-all flex items-center justify-between">
                    <span>{asset.ipId}</span>
                    <button
                      onClick={() => copyToClipboard(asset.ipId)}
                      className="ml-2 p-1 hover:bg-border rounded"
                      title="Copy to clipboard"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Collection</dt>
                  <dd className="text-sm text-foreground">
                    {asset.nftMetadata?.tokenContract ? getContractName(asset.nftMetadata.tokenContract) : "Unknown"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Token ID</dt>
                  <dd className="text-sm text-foreground">{asset.nftMetadata?.tokenId || "N/A"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Chain ID</dt>
                  <dd className="text-sm text-foreground">{asset.nftMetadata?.chainId || "1315"}</dd>
                </div>
                {blockchainData?.nftOwner && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-1">Current Owner</dt>
                    <dd className="text-sm text-foreground font-mono bg-muted p-2 rounded border break-all flex items-center justify-between">
                      <span>{blockchainData.nftOwner}</span>
                      <button
                        onClick={() => copyToClipboard(blockchainData.nftOwner!)}
                        className="ml-2 p-1 hover:bg-border rounded"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </dd>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Children Count</dt>
                  <dd className="text-sm text-foreground">
                    <span className="text-lg font-semibold">{asset.childrenCount || 0}</span>
                    {asset.childrenCount > 0 && <span className="text-muted-foreground ml-1">direct children</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Total Descendants</dt>
                  <dd className="text-sm text-foreground">
                    <span className="text-lg font-semibold">{asset.descendantCount || 0}</span>
                    {asset.descendantCount > 0 && <span className="text-muted-foreground ml-1">total descendants</span>}
                  </dd>
                </div>
                {blockchainData && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-1">Live Derivatives</dt>
                    <dd className="text-sm text-foreground">
                      <span className="text-lg font-semibold">{blockchainData.derivativeCount}</span>
                      <span className="text-muted-foreground ml-1">on-chain derivatives</span>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Created</dt>
                  <dd className="text-sm text-foreground">
                    {asset.blockTimestamp ? formatTimestamp(asset.blockTimestamp) : "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Block Number</dt>
                  <dd className="text-sm text-foreground">{asset.blockNumber || "N/A"}</dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blockchain Data */}
      {blockchainData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* License Information */}
          <div className="asset-detail-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5" />
              License Information
            </h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-1">Attached Licenses</dt>
                <dd className="text-sm text-foreground">
                  <span className="text-lg font-semibold">{blockchainData.licenseCount}</span>
                  <span className="text-muted-foreground ml-1">license templates</span>
                </dd>
              </div>

              {blockchainData.licenseTerms.template && (
                <>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-1">License Template</dt>
                    <dd className="text-sm text-foreground font-mono bg-muted p-2 rounded border break-all">
                      {blockchainData.licenseTerms.template}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground mb-1">Terms ID</dt>
                    <dd className="text-sm text-foreground">{blockchainData.licenseTerms.termsId}</dd>
                  </div>

                  {blockchainData.licenseTerms.decodedTerms && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground mb-2">License Terms</dt>
                      <dd className="text-sm">
                        {(() => {
                          const terms = formatLicenseTerms(blockchainData.licenseTerms.decodedTerms)
                          if (!terms) return <span className="text-muted-foreground">Unable to decode terms</span>

                          return (
                            <div className="bg-muted/30 p-3 rounded border space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Transferable:</span>{" "}
                                  <span className={terms.transferable ? "text-green-400" : "text-red-400"}>
                                    {terms.transferable ? "Yes" : "No"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Commercial Use:</span>{" "}
                                  <span className={terms.commercialUse ? "text-green-400" : "text-red-400"}>
                                    {terms.commercialUse ? "Allowed" : "Not Allowed"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Derivatives:</span>{" "}
                                  <span className={terms.derivativesAllowed ? "text-green-400" : "text-red-400"}>
                                    {terms.derivativesAllowed ? "Allowed" : "Not Allowed"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Attribution:</span>{" "}
                                  <span className={terms.commercialAttribution ? "text-yellow-400" : "text-green-400"}>
                                    {terms.commercialAttribution ? "Required" : "Not Required"}
                                  </span>
                                </div>
                              </div>
                              {terms.defaultMintingFee && terms.defaultMintingFee !== "0" && (
                                <div className="text-xs">
                                  <span className="text-muted-foreground">Minting Fee:</span> {terms.defaultMintingFee}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </dd>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Royalty & Economics */}
          <div className="asset-detail-card p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Royalty & Economics
            </h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-1">Royalty Vault</dt>
                <dd className="text-sm text-foreground font-mono bg-muted p-2 rounded border break-all">
                  {blockchainData.royaltyVault === "0x0000000000000000000000000000000000000000"
                    ? "No vault assigned"
                    : blockchainData.royaltyVault}
                </dd>
              </div>

              {blockchainData.royaltyVault !== "0x0000000000000000000000000000000000000000" && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground mb-1">WIP Token Balance</dt>
                  <dd className="text-sm text-foreground">
                    <span className="text-lg font-semibold">{blockchainData.wipBalance.toFixed(4)}</span>
                    <span className="text-muted-foreground ml-1">WIP</span>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-1">Disputes</dt>
                <dd className="text-sm text-foreground">
                  <span className="text-lg font-semibold">{blockchainData.disputeCount}</span>
                  <span className="text-muted-foreground ml-1">disputes raised</span>
                </dd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blockchain Details */}
      <div className="asset-detail-card p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Blockchain Details</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-1">Transaction Hash</dt>
            <dd className="text-sm text-foreground font-mono bg-muted p-2 rounded border break-all flex items-center justify-between">
              <span>{asset.transactionHash}</span>
              <button
                onClick={() => copyToClipboard(asset.transactionHash)}
                className="ml-2 p-1 hover:bg-border rounded"
                title="Copy to clipboard"
              >
                <Copy className="w-3 h-3" />
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground mb-1">Contract Address</dt>
            <dd className="text-sm text-foreground font-mono bg-muted p-2 rounded border break-all flex items-center justify-between">
              <span>{asset.nftMetadata?.tokenContract || "N/A"}</span>
              {asset.nftMetadata?.tokenContract && (
                <button
                  onClick={() => copyToClipboard(asset.nftMetadata.tokenContract)}
                  className="ml-2 p-1 hover:bg-border rounded"
                  title="Copy to clipboard"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </dd>
          </div>
        </div>

        {asset.rootIpIds.length > 0 && (
          <div className="mt-4">
            <dt className="text-sm font-medium text-muted-foreground mb-2">Root IP IDs</dt>
            <dd className="space-y-2">
              {asset.rootIpIds.map((rootId) => (
                <div
                  key={rootId}
                  className="text-sm text-foreground font-mono bg-muted p-2 rounded border break-all flex items-center justify-between"
                >
                  <span>{rootId}</span>
                  <button
                    onClick={() => copyToClipboard(rootId)}
                    className="ml-2 p-1 hover:bg-border rounded"
                    title="Copy to clipboard"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </dd>
          </div>
        )}
      </div>

      {/* Additional Metadata */}
      {blockchainData?.coreMetadata && (
        <div className="asset-detail-card p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Core Metadata</h2>
          <div className="bg-muted/30 p-4 rounded border">
            <pre className="text-xs overflow-auto">{JSON.stringify(blockchainData.coreMetadata, null, 2)}</pre>
          </div>
        </div>
      )}

      {blockchainData?.jsonMetadata && (
        <div className="asset-detail-card p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">JSON Metadata</h2>
          <div className="bg-muted/30 p-4 rounded border">
            <pre className="text-xs overflow-auto">{blockchainData.jsonMetadata}</pre>
          </div>
        </div>
      )}

      {/* Related Assets */}
      {sameRootAssets.length > 0 && (
        <div className="asset-detail-card p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center gap-2">
            <Users className="w-5 h-5" />
            Related Assets ({sameRootAssets.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sameRootAssets.slice(0, 9).map((relatedAsset) => (
              <Link
                key={relatedAsset.ipId}
                href={`/asset/${relatedAsset.ipId}`}
                className="block p-4 border border-border rounded-lg hover:border-primary/50 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center space-x-3">
                  {relatedAsset.nftMetadata?.imageUrl ? (
                    <img
                      src={relatedAsset.nftMetadata.imageUrl || "/placeholder.svg"}
                      alt={relatedAsset.nftMetadata.name || "Related asset"}
                      className="h-12 w-12 rounded-lg object-cover border border-border"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border border-border">
                      <span className="text-xs">🖼️</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {relatedAsset.nftMetadata?.name || "Unnamed Asset"}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{relatedAsset.ipId.substring(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">Token #{relatedAsset.nftMetadata?.tokenId}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {sameRootAssets.length > 9 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">And {sameRootAssets.length - 9} more related assets...</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
