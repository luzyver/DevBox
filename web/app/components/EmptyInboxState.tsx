export function EmptyInboxState() {
  return (
    <div className="card-sticker p-6 md:p-8 text-center">
      <div className="w-14 h-14 md:w-16 md:h-16 bg-muted rounded-full mx-auto mb-3 md:mb-4 flex items-center justify-center text-2xl">
        📭
      </div>
      <p className="text-muted-foreground font-medium">No emails yet</p>
      <p className="text-sm text-muted-foreground mt-1">Emails will appear here automatically</p>
    </div>
  )
}
