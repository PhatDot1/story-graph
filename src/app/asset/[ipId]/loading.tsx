export default function Loading() {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-start">
          <div>
            <div className="h-8 bg-muted rounded w-64 mb-2"></div>
            <div className="h-4 bg-muted rounded w-32"></div>
          </div>
          <div className="h-10 bg-muted rounded w-32"></div>
        </div>
  
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-card p-6 rounded-lg border">
              <div className="h-4 bg-muted rounded w-24 mb-4"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
  
          <div className="lg:col-span-2">
            <div className="bg-card p-6 rounded-lg border">
              <div className="h-6 bg-muted rounded w-32 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}>
                      <div className="h-3 bg-muted rounded w-16 mb-1"></div>
                      <div className="h-4 bg-muted rounded w-full"></div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i}>
                      <div className="h-3 bg-muted rounded w-20 mb-1"></div>
                      <div className="h-4 bg-muted rounded w-24"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  