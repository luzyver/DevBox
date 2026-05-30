import { MessageSummary } from './types'

interface Props {
  message: MessageSummary
  isSelected: boolean
  isNew: boolean
  onClick: () => void
}

export function MessageCard({ message, isSelected, isNew, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 md:p-4 border-2 rounded-xl transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-accent bg-accent/5 shadow-card-accent'
          : isNew
            ? 'border-quaternary bg-quaternary/5 shadow-[4px_4px_0px_0px_#34D399]'
            : 'border-border bg-card hover:border-foreground hover:shadow-[2px_2px_0px_0px_#1E293B] md:hover:shadow-pop hover:-translate-y-0.5'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 bg-quaternary rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            {message.from[0]?.toUpperCase()}
          </span>
          <span className="font-semibold truncate text-sm">{message.from}</span>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(message.date * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="font-medium mt-1 truncate">{message.subject}</p>
      <p className="text-sm text-muted-foreground mt-0.5 truncate">{message.body.slice(0, 80)}</p>
      {isNew && (
        <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider text-quaternary">● New</span>
      )}
    </button>
  )
}
