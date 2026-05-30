interface Props {
  address: string
  history: { address: string, token: string }[]
  onCopy: () => void
  onSwitch: (entry: { address: string, token: string }) => void
  copied: boolean
}

export function InboxAddressCard({ address, history, onCopy, onSwitch, copied }: Props) {
  return (
    <div className="border-b-2 border-foreground bg-muted">
      <div className="px-4 md:px-6 py-2 md:py-3 flex items-center gap-2 md:gap-3">
        <span className="hidden md:inline text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Your inbox:
        </span>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <select
            value={address}
            onChange={e => {
              const entry = history.find(h => h.address === e.target.value)
              if (entry) onSwitch(entry)
            }}
            className="min-w-0 flex-1 bg-card border-2 border-foreground rounded-lg px-3 md:px-4 py-2 font-mono text-sm md:text-lg shadow-[2px_2px_0px_0px_#1E293B] md:shadow-pop truncate appearance-none cursor-pointer"
          >
            {history.map(h => (
              <option key={h.address} value={h.address}>{h.address}</option>
            ))}
          </select>
          <button onClick={onCopy} className="btn-primary !py-2 !px-3 md:!px-4 text-xs md:text-sm whitespace-nowrap">
            {copied ? '✓ Copied!' : '⎘ Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}
