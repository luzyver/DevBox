export function SkeletonList() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-4 border-2 border-border rounded-xl animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="h-4 bg-muted rounded w-32" />
          </div>
          <div className="h-4 bg-muted rounded w-48 mt-2" />
          <div className="h-3 bg-muted rounded w-64 mt-1.5" />
        </div>
      ))}
    </div>
  )
}
