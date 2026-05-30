import { ConnectionState } from './types'

interface Props {
  domains: string[]
  domain: string
  onDomainChange: (d: string) => void
  onNewInbox: () => void
  connectionState: ConnectionState
}

export function InboxToolbar({ domains, domain, onDomainChange, onNewInbox }: Props) {
  return (
    <header className="border-b-2 border-foreground bg-card">
      <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-2">
        <h1 className="text-xl md:text-2xl font-extrabold font-[family-name:var(--font-heading)] flex items-center gap-2 shrink-0">
          <img src="/icon.png" alt="DevBox" className="w-8 h-8 md:w-12 md:h-12" />
          <span>DevBox</span>
        </h1>
        <div className="flex items-center gap-1.5 md:gap-3 min-w-0">
          <select
            value={domain}
            onChange={e => onDomainChange(e.target.value)}
            className="input-geo min-w-0 !py-1.5 !px-2 md:!py-2 md:!px-3 text-xs md:text-sm font-medium truncate"
          >
            {domains.map(d => <option key={d} value={d}>@{d}</option>)}
          </select>
          <button onClick={onNewInbox} disabled={domains.length === 0} className="btn-secondary !py-1.5 !px-2 md:!py-2 md:!px-4 text-xs md:text-sm shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
            ↻ New
          </button>
        </div>
      </div>
    </header>
  )
}
