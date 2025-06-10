import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"

// ── CONFIG ─────────────────────────────────────────────────────────────────────
const RPC = "https://aeneid.storyrpc.io"
const CHAIN_ID = 1315

const IP_ASSET_REGISTRY = "0x77319B4031e6eF1250907aa00018B8B1c67a244b"
const LICENSE_REGISTRY = "0x529a750E02d8E2f15649c13D69a465286a780e24"
const PIL_TEMPLATE = "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316"
const LICENSING_MODULE = "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f"
const DISPUTE_MODULE = "0x0000000000000000000000000000000000000000" // replace with actual
const METADATA_VIEW = "0x0000000000000000000000000000000000000000" // replace with actual
const ROYALTY_MODULE = "0x0000000000000000000000000000000000000000" // replace with actual
const WIP_TOKEN_ADDRESS = "0x1514000000000000000000000000000000000000"

// ABIs
const ipAssetRegistryAbi = ["function ipId(uint256, address, uint256) view returns (address)"]

const licenseRegistryAbi = [
  "function getAttachedLicenseTermsCount(address) view returns (uint256)",
  "function getAttachedLicenseTerms(address, uint256) view returns (address,uint256)",
]

const pilTemplateAbi = [
  "function getLicenseTerms(uint256) view returns (bool,address,uint256,uint256,bool,bool,address,bytes,uint32,uint256,bool,bool,bool,bool,uint32,uint256,address,string)",
]

const nftAbi = ["function ownerOf(uint256) view returns (address)", "function tokenURI(uint256) view returns (string)"]

const metadataViewAbi = [
  "function getCoreMetadata(address) view returns (tuple(string metadataURI, bytes32 metadataHash, string nftTokenURI, bytes32 nftMetadataHash, uint256 registrationDate, address owner))",
  "function getJsonString(address) view returns (string)",
]

const royaltyModuleAbi = ["function getRoyaltyVault(address) view returns (address)"]

const erc20Abi = ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"]

// Helper: pad an address for topics
function padAddress(addr: string): string {
  return "0x" + addr.toLowerCase().replace(/^0x/, "").padStart(64, "0")
}

interface BlockchainAssetData {
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ ipId: string }> }) {
  try {
    const { ipId } = await params
    const { searchParams } = new URL(request.url)
    const tokenContract = searchParams.get("tokenContract")
    const tokenId = searchParams.get("tokenId")

    if (!tokenContract || !tokenId) {
      return NextResponse.json({ error: "Missing tokenContract or tokenId parameters" }, { status: 400 })
    }

    const provider = new ethers.JsonRpcProvider(RPC)

    // Initialize result object
    const result: BlockchainAssetData = {
      ipId,
      nftOwner: null,
      metadataUri: null,
      portalUrl: `https://portal.story.foundation/assets/${ipId}`,
      explorerUrl: `https://explorer.story.foundation/ipa/${ipId}`,
      derivativeCount: 0,
      disputeCount: 0,
      licenseCount: "0",
      licenseTerms: {
        template: null,
        termsId: null,
        decodedTerms: null,
      },
      coreMetadata: null,
      jsonMetadata: null,
      royaltyVault: ethers.ZeroAddress,
      wipBalance: 0,
    }

    // 1) Verify IP ID matches
    try {
      const ipRegistry = new ethers.Contract(IP_ASSET_REGISTRY, ipAssetRegistryAbi, provider)
      const computedIpId: string = await ipRegistry.ipId(CHAIN_ID, tokenContract, tokenId)
      if (computedIpId.toLowerCase() !== ipId.toLowerCase()) {
        console.warn(`IP ID mismatch: expected ${ipId}, got ${computedIpId}`)
      }
    } catch (error) {
      console.error("Error verifying IP ID:", error)
    }

    // 2) NFT owner + metadata
    try {
      const nft = new ethers.Contract(tokenContract, nftAbi, provider)
      result.nftOwner = await nft.ownerOf(tokenId).catch(() => null)
      result.metadataUri = await nft.tokenURI(tokenId).catch(() => null)
    } catch (error) {
      console.error("Error fetching NFT data:", error)
    }

    // 3) Derivative count via event logs
    try {
      const derivTopic = ethers.id("DerivativeRegistered(address,address,address)")
      const derivLogs = await provider.getLogs({
        address: LICENSING_MODULE,
        topics: [derivTopic, null, padAddress(ipId)],
        fromBlock: 0,
        toBlock: "latest",
      })
      result.derivativeCount = derivLogs.length
    } catch (error) {
      console.error("Error fetching derivative count:", error)
    }

    // 4) Dispute count via event logs (if dispute module is available)
    if (DISPUTE_MODULE !== "0x0000000000000000000000000000000000000000") {
      try {
        const dispTopic = ethers.id("DisputeRaised(address,address,uint256)")
        const dispLogs = await provider.getLogs({
          address: DISPUTE_MODULE,
          topics: [dispTopic, padAddress(ipId)],
          fromBlock: 0,
          toBlock: "latest",
        })
        result.disputeCount = dispLogs.length
      } catch (error) {
        console.error("Error fetching dispute count:", error)
      }
    }

    // 5) License terms
    try {
      const licReg = new ethers.Contract(LICENSE_REGISTRY, licenseRegistryAbi, provider)
      const licCountBig: bigint = await licReg.getAttachedLicenseTermsCount(ipId)
      result.licenseCount = licCountBig.toString()

      if (licCountBig > BigInt(0)) {
        const [templ, tId]: [string, bigint] = await licReg.getAttachedLicenseTerms(ipId, 0)
        result.licenseTerms.template = templ
        result.licenseTerms.termsId = tId.toString()

        // Try to decode license terms
        try {
          const pil = new ethers.Contract(PIL_TEMPLATE, pilTemplateAbi, provider)
          const terms = await pil.getLicenseTerms(tId)
          result.licenseTerms.decodedTerms = terms
        } catch (error) {
          console.warn("Error decoding license terms:", error)
        }
      }
    } catch (error) {
      console.error("Error fetching license data:", error)
    }

    // 6) Metadata via module (if available)
    if (METADATA_VIEW !== "0x0000000000000000000000000000000000000000") {
      try {
        const metaView = new ethers.Contract(METADATA_VIEW, metadataViewAbi, provider)
        result.coreMetadata = await metaView.getCoreMetadata(ipId).catch(() => null)
        result.jsonMetadata = await metaView.getJsonString(ipId).catch(() => null)
      } catch (error) {
        console.error("Error fetching metadata:", error)
      }
    }

    // 7) Royalty vault & WIP balance (if available)
    if (ROYALTY_MODULE !== "0x0000000000000000000000000000000000000000") {
      try {
        const royaltyMod = new ethers.Contract(ROYALTY_MODULE, royaltyModuleAbi, provider)
        const vault: string = await royaltyMod.getRoyaltyVault(ipId)
        result.royaltyVault = vault

        if (vault !== ethers.ZeroAddress) {
          const token = new ethers.Contract(WIP_TOKEN_ADDRESS, erc20Abi, provider)
          const bal: bigint = await token.balanceOf(vault)
          const decimals: number = Number(await token.decimals().catch(() => 18))
          result.wipBalance = Number(bal) / 10 ** decimals
        }
      } catch (error) {
        console.error("Error fetching royalty data:", error)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "Failed to fetch blockchain data" }, { status: 500 })
  }
}
