export function SkeletonDetail() {
  return (
    <div className="card-sticker p-6 h-full animate-pulse">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-6 bg-muted rounded w-64 mb-3" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div>
              <div className="h-4 bg-muted rounded w-40" />
              <div className="h-3 bg-muted rounded w-24 mt-1" />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t-2 border-border pt-4 space-y-2">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="h-3 bg-muted rounded w-4/6" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-3/6" />
      </div>
    </div>
  )
}
