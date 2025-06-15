// pages/api/asset/[tokenId].ts

import type { NextApiRequest, NextApiResponse } from "next"
import { ethers } from "ethers"

// ── CONFIG ─────────────────────────────────────────────────────────────────────
const RPC        = "https://aeneid.storyrpc.io"
const CHAIN_ID   = 1315

const IP_ASSET_REGISTRY  = "0x77319B4031e6eF1250907aa00018B8B1c67a244b"
const LICENSE_REGISTRY   = "0x529a750E02d8E2f15649c13D69a465286a780e24"
const PIL_TEMPLATE       = "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316"
const LICENSING_MODULE   = "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f"
const DISPUTE_MODULE     = "0x0000000000000000000000000000000000000000"
const METADATA_VIEW      = "0x0000000000000000000000000000000000000000"
const ROYALTY_MODULE     = "0x0000000000000000000000000000000000000000"
const WIP_TOKEN_ADDRESS  = "0x1514000000000000000000000000000000000000"

// ── ABIs ───────────────────────────────────────────────────────────────────────
const ipAssetRegistryAbi = [
  "function ipId(uint256,address,uint256) view returns (address)"
]
const licenseRegistryAbi = [
  "function getAttachedLicenseTermsCount(address) view returns (uint256)",
  "function getAttachedLicenseTerms(address,uint256) view returns (address,uint256)"
]
const pilTemplateAbi = [
  "function getLicenseTerms(uint256) view returns (bool,address,uint256,uint256,bool,bool,address,bytes,uint32,uint256,bool,bool,bool,bool,uint32,uint256,address,string)"
]
const nftAbi = [
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)"
]

// pads an address into a 32-byte log topic
function padAddress(addr: string) {
  return "0x" + addr.toLowerCase().replace(/^0x/, "").padStart(64, "0")
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { tokenId, contract } = req.query
  if (Array.isArray(tokenId) || !tokenId || Array.isArray(contract) || !contract) {
    return res.status(400).json({ error: "Missing or invalid tokenId or contract" })
  }

  const NFT_CONTRACT = contract as string

  try {
    const provider = new ethers.JsonRpcProvider(RPC)
    const id       = BigInt(tokenId)

    // 1) Compute IP ID
    const ipReg = new ethers.Contract(
      IP_ASSET_REGISTRY,
      ipAssetRegistryAbi,
      provider
    )
    const ipId: string = await ipReg.ipId(CHAIN_ID, NFT_CONTRACT, id)

    // 2) Owner + tokenURI
    const nft   = new ethers.Contract(NFT_CONTRACT, nftAbi, provider)
    const owner = await nft.ownerOf(id).catch(() => null)
    const uri   = await nft.tokenURI(id).catch(() => null)

    // 3) URLs
    const portalUrl   = `https://portal.story.foundation/assets/${ipId}`
    const explorerUrl = `https://explorer.story.foundation/ipa/${ipId}`

    // 4) Derivatives
    const derivTopic = ethers.id("DerivativeRegistered(address,address,address)")
    const derivLogs  = await provider.getLogs({
      address: LICENSING_MODULE,
      topics: [derivTopic, null, padAddress(ipId)],
      fromBlock: 0,
      toBlock: "latest",
    }).catch(() => [])

    // 5) Disputes
    const dispTopic = ethers.id("DisputeRaised(address,address,uint256)")
    const dispLogs  = await provider.getLogs({
      address: DISPUTE_MODULE,
      topics: [dispTopic, padAddress(ipId)],
      fromBlock: 0,
      toBlock: "latest",
    }).catch(() => [])

    // 6) License terms
    const licReg   = new ethers.Contract(LICENSE_REGISTRY, licenseRegistryAbi, provider)
    const countBig = await licReg.getAttachedLicenseTermsCount(ipId).catch(() => BigInt(0))

    let template: string | null = null
    let termsId:  string | null = null
    let decodedTerms: any[]     = []

    if (countBig > BigInt(0)) {
      const [templ, tId]: [string, bigint] =
        await licReg.getAttachedLicenseTerms(ipId, 0)
      template = templ
      termsId  = tId.toString()

      const pil = new ethers.Contract(PIL_TEMPLATE, pilTemplateAbi, provider)
      const raw = await pil.getLicenseTerms(tId).catch(() => null)
      if (Array.isArray(raw)) {
        decodedTerms = raw.map((v) =>
          typeof v === "bigint" ? v.toString() : v
        )
      }
    }

    return res.status(200).json({
      ipId,
      nftOwner:        owner,
      metadataUri:     uri,
      portalUrl,
      explorerUrl,
      derivativeCount: derivLogs.length,
      disputeCount:    dispLogs.length,
      licenseCount:    countBig.toString(),
      licenseTerms:    { template, termsId, decodedTerms },
      coreMetadata:    null,
      jsonMetadata:    null,
      royaltyVault:    ethers.ZeroAddress,
      wipBalance:      0,
    })
  } catch (err: any) {
    console.error("API route error:", err)
    return res.status(500).json({ error: err.message })
  }
}
