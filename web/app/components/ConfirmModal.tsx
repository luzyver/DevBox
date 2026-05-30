'use client'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onCancel} />
      <div className="relative bg-card border-2 border-foreground rounded-xl shadow-pop p-6 max-w-sm w-full animate-pop-in">
        <h3 className="text-lg font-bold font-[family-name:var(--font-heading)] mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary !py-2 !px-4 text-sm">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="btn-primary !py-2 !px-4 text-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
