import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-muted-foreground mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Asset Not Found</h2>
          <p className="text-muted-foreground">
            The IP asset you're looking for doesn't exist or may have been removed.
          </p>
        </div>

        <div className="space-x-4">
          <Link href="/" className="btn-primary px-6 py-3 rounded-lg inline-block">
            Back to Dashboard
          </Link>
          <Link href="/network" className="btn-secondary px-6 py-3 rounded-lg inline-block">
            View Network
          </Link>
        </div>
      </div>
    </div>
  )
}
