import { readAssets } from "@/lib/server-data.server"
import { AssetDetail } from "@/components/asset-detail"
import { notFound } from "next/navigation"

interface AssetPageProps {
  params: Promise<{
    ipId: string
  }>
}

export default async function AssetPage({ params }: AssetPageProps) {
  try {
    const { ipId } = await params
    console.log("Looking for asset with ipId:", ipId)

    const assets = await readAssets()
    console.log("Total assets loaded:", assets.length)
    console.log(
      "First few asset IDs:",
      assets.slice(0, 3).map((a) => a.ipId),
    )

    const asset = assets.find((a) => a.ipId === ipId)
    console.log("Found asset:", asset ? "YES" : "NO")

    if (!asset) {
      console.log("Asset not found, returning 404")
      notFound()
    }

    return <AssetDetail asset={asset} relatedAssets={assets} />
  } catch (error) {
    console.error("Error in AssetPage:", error)
    notFound()
  }
}

export async function generateMetadata({ params }: AssetPageProps) {
  try {
    const { ipId } = await params
    const assets = await readAssets()
    const asset = assets.find((a) => a.ipId === ipId)

    if (!asset) {
      return {
        title: "Asset Not Found - IP Radar",
      }
    }

    return {
      title: `${asset.nftMetadata?.name || "IP Asset"} - IP Radar`,
      description: `View details for IP Asset ${asset.ipId}`,
    }
  } catch (error) {
    return {
      title: "Asset Not Found - IP Radar",
    }
  }
}
