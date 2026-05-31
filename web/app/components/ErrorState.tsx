import { Warning } from '@phosphor-icons/react'

interface Props {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="card-sticker p-6 md:p-8 text-center border-secondary">
      <div className="w-14 h-14 bg-secondary/10 rounded-full mx-auto mb-3 flex items-center justify-center">
        <Warning className="w-7 h-7 text-secondary" weight="duotone" />
      </div>
      <p className="font-medium text-foreground">{message}</p>
      <button onClick={onRetry} className="btn-secondary !py-2 !px-4 text-sm mt-4">
        Try again
      </button>
    </div>
  )
}
