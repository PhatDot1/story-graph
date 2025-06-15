import { readAssets } from "@/lib/server-data.server"
import { Dashboard } from "@/components/dashboard"

export default async function Home() {
  const assets = await readAssets()

  return <Dashboard initialAssets={assets} />
}
