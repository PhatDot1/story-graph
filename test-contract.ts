#!/usr/bin/env ts-node

import "dotenv/config";
import { ethers } from "ethers";

// ── CONFIG ─────────────────────────────────────────────────────────────────────
const RPC = "https://aeneid.storyrpc.io";      // Aeneid Testnet RPC
const CHAIN_ID = 1315;

const NFT_CONTRACT       = "0x98Caab9438337Aa19AC2ef05864A5E3273f39Dab";
const TOKEN_ID           = 1144;   // example tokenId

const IP_ASSET_REGISTRY  = "0x77319B4031e6eF1250907aa00018B8B1c67a244b";
const LICENSE_REGISTRY   = "0x529a750E02d8E2f15649c13D69a465286a780e24";
const PIL_TEMPLATE       = "0x2E896b0b2Fdb7457499B56AAaA4AE55BCB4Cd316";

const LICENSING_MODULE   = "0x04fbd8a2e56dd85CFD5500A4A4DfA955B9f1dE6f";  // testnet
const DISPUTE_MODULE     = "0x0000000000000000000000000000000000000000";  // replace
const METADATA_VIEW      = "0x0000000000000000000000000000000000000000";  // replace
const ROYALTY_MODULE     = "0x0000000000000000000000000000000000000000";  // replace

const WIP_TOKEN_ADDRESS  = "0x1514000000000000000000000000000000000000";    // example
// ────────────────────────────────────────────────────────────────────────────────

// ABIs
const ipAssetRegistryAbi = [
  "function ipId(uint256, address, uint256) view returns (address)"
];
const licenseRegistryAbi = [
  "function getAttachedLicenseTermsCount(address) view returns (uint256)",
  "function getAttachedLicenseTerms(address, uint256) view returns (address,uint256)"
];
const pilTemplateAbi = [
  "function getLicenseTerms(uint256) view returns (bool,address,uint256,uint256,bool,bool,address,bytes,uint32,uint256,bool,bool,bool,bool,uint32,uint256,address,string)"
];
const nftAbi = [
  "function ownerOf(uint256) view returns (address)",
  "function tokenURI(uint256) view returns (string)"
];
const metadataViewAbi = [
  "function getCoreMetadata(address) view returns (tuple(string metadataURI, bytes32 metadataHash, string nftTokenURI, bytes32 nftMetadataHash, uint256 registrationDate, address owner))",
  "function getJsonString(address) view returns (string)"
];
const royaltyModuleAbi = [
  "function getRoyaltyVault(address) view returns (address)"
];
const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// Helper: pad an address for topics
function padAddress(addr: string): string {
  return "0x" + addr.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);

  // 1) Compute IP ID
  const ipRegistry = new ethers.Contract(IP_ASSET_REGISTRY, ipAssetRegistryAbi, provider);
  const ipId: string = await ipRegistry.ipId(CHAIN_ID, NFT_CONTRACT, TOKEN_ID);
  console.log("IP Asset ID:", ipId);

  // 2) NFT owner + metadata
  const nft = new ethers.Contract(NFT_CONTRACT, nftAbi, provider);
  const owner = await nft.ownerOf(TOKEN_ID).catch(() => null);
  const uri   = await nft.tokenURI(TOKEN_ID).catch(() => null);
  console.log("NFT Owner:", owner);
  console.log("Metadata URI:", uri);

  // 3) External links
  console.log("Portal URL:   https://portal.story.foundation/assets/" + ipId);
  console.log("Explorer URL: https://explorer.story.foundation/ipa/" + ipId);

  // 4) Derivative count via event signature hash
  const derivTopic = ethers.id("DerivativeRegistered(address,address,address)");
  const derivLogs = await provider.getLogs({
    address: LICENSING_MODULE,
    topics: [ derivTopic, null, padAddress(ipId) ],
  }).catch(() => []);
  console.log("Derivatives (children):", derivLogs.length);

  // 5) Dispute count via event signature hash
  const dispTopic = ethers.id("DisputeRaised(address,address,uint256)");
  const dispLogs = await provider.getLogs({
    address: DISPUTE_MODULE,
    topics: [ dispTopic, padAddress(ipId) ],
  }).catch(() => []);
  console.log("Disputes raised:", dispLogs.length);

  // 6) License terms
  const licReg = new ethers.Contract(LICENSE_REGISTRY, licenseRegistryAbi, provider);
  const licCountBig: bigint = await licReg.getAttachedLicenseTermsCount(ipId).catch(() => BigInt(0));
  console.log("Attached license templates:", licCountBig.toString());
  if (licCountBig > BigInt(0)) {
    const [templ, tId]: [string, bigint] = await licReg.getAttachedLicenseTerms(ipId, 0);
    console.log("Template:", templ);
    console.log("Terms ID:", tId.toString());
    const pil = new ethers.Contract(PIL_TEMPLATE, pilTemplateAbi, provider);
    const terms = await pil.getLicenseTerms(tId).catch(err => {
      console.warn("Decode error:", err);
      return null;
    });
    console.log("License terms raw/decoded:", terms);
  }

  // 7) Metadata via module
  const metaView = new ethers.Contract(METADATA_VIEW, metadataViewAbi, provider);
  const coreMeta = await metaView.getCoreMetadata(ipId).catch(() => null);
  const jsonMeta = await metaView.getJsonString(ipId).catch(() => null);
  console.log("Core Metadata:", coreMeta);
  console.log("JSON Metadata:", jsonMeta);

  // 8) Royalty vault & WIP balance
  const royaltyMod = new ethers.Contract(ROYALTY_MODULE, royaltyModuleAbi, provider);
  const vault: string = await royaltyMod.getRoyaltyVault(ipId).catch(() => ethers.ZeroAddress);
  console.log("Royalty Vault:", vault);
  if (vault !== ethers.ZeroAddress) {
    const token = new ethers.Contract(WIP_TOKEN_ADDRESS, erc20Abi, provider);
    const bal: bigint    = await token.balanceOf(vault).catch(() => BigInt(0));
    const decimals: number = Number(await token.decimals().catch(() => 18));
    console.log("Vault WIP Balance:", Number(bal) / 10**decimals);
  }

  console.log("\n✅ Done");
}

main().catch(console.error);
