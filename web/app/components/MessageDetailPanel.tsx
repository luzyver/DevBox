import { ArrowLeft, X, Paperclip, DownloadSimple, Trash } from '@phosphor-icons/react'
import { MessageSummary } from './types'
import { getToken } from './api'

interface Props {
  message: MessageSummary
  onClose: () => void
  onDelete: (id: string) => void
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MessageDetailPanel({ message, onClose, onDelete }: Props) {
  const downloadUrl = (attachId: string) =>
    `/api/inbox/${message.to}/${message.id}/attachment/${attachId}`

  async function handleDownload(attachId: string, filename: string) {
    const res = await fetch(downloadUrl(attachId), {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="card-sticker p-4 md:p-6 h-full animate-pop-in flex flex-col overflow-hidden">
      <div className="flex items-start justify-between mb-4 md:mb-6 gap-2 shrink-0">
        <div className="min-w-0">
          <h2 className="text-lg md:text-xl font-bold font-[family-name:var(--font-heading)] truncate">
            {message.subject}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {message.from[0]?.toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{message.from}</p>
              <p className="text-xs text-muted-foreground truncate">to {message.to}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline text-sm text-muted-foreground">
            {new Date(message.date * 1000).toLocaleString()}
          </span>
          <button
            onClick={() => onDelete(message.id)}
            className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-border hover:border-red-500 hover:bg-red-50 transition-colors"
            aria-label="Delete email"
          >
            <Trash className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-border hover:border-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <span className="md:hidden"><ArrowLeft className="w-4 h-4" /></span>
            <span className="hidden md:inline"><X className="w-4 h-4" /></span>
          </button>
        </div>
      </div>

      {message.attachments && message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 shrink-0">
          {message.attachments.map(att => (
            <button
              key={att.id}
              onClick={() => handleDownload(att.id, att.filename)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border-2 border-border rounded-lg text-sm hover:border-accent transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" weight="duotone" />
              <span className="truncate max-w-[150px]">{att.filename}</span>
              <span className="text-xs text-muted-foreground">({formatSize(att.size)})</span>
              <DownloadSimple className="w-3.5 h-3.5 text-accent" weight="bold" />
            </button>
          ))}
        </div>
      )}

      <div className="border-t-2 border-border pt-4 flex-1 min-h-0 overflow-y-auto">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-[family-name:var(--font-body)]">
          {message.body}
        </pre>
      </div>
    </div>
  )
}
