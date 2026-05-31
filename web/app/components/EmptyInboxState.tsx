import { Tray } from '@phosphor-icons/react'

export function EmptyInboxState() {
  return (
    <div className="card-sticker p-6 md:p-8 text-center">
      <div className="w-14 h-14 md:w-16 md:h-16 bg-muted rounded-full mx-auto mb-3 md:mb-4 flex items-center justify-center">
        <Tray className="w-7 h-7 text-muted-foreground" weight="duotone" />
      </div>
      <p className="text-muted-foreground font-medium">No emails yet</p>
      <p className="text-sm text-muted-foreground mt-1">Emails will appear here automatically</p>
    </div>
  )
}
