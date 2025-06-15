import { MyAssetsClient } from "./my-assets-client"
import { readOwnerAssets, IPAssetWithOwner } from "@/lib/server-data-owner"

export default async function MyAssetsPage() {
  // This is a server component—`fs` is allowed here
  const allAssets: IPAssetWithOwner[] = await readOwnerAssets()

  return <MyAssetsClient allAssets={allAssets} />
}
