'use client'

import { useState } from 'react'
import { Lock, LockOpen, Trash } from '@phosphor-icons/react'
import { PickerModal } from './PickerModal'

interface Props {
  address: string
  history: { address: string, token: string }[]
  lockedAddresses: Set<string>
  onCopy: () => void
  onSwitch: (entry: { address: string, token: string }) => void
  onToggleLock: (addr: string) => void
  onDeleteHistory: (addr: string) => void
  copied: boolean
  pickerDisabled?: boolean
  label?: string
}

export function InboxAddressCard({ address, history, lockedAddresses, onCopy, onSwitch, onToggleLock, onDeleteHistory, copied, pickerDisabled = false, label = 'Your inbox:' }: Props) {
  const [showPicker, setShowPicker] = useState(false)

  if (!address) return null

  return (
    <>
      <div className="border-b-2 border-foreground bg-muted">
        <div className="px-4 md:px-6 py-2 md:py-3 flex items-center gap-2 md:gap-3">
          <span className="hidden md:inline text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <button
              onClick={() => {
                if (!pickerDisabled) setShowPicker(true)
              }}
              disabled={pickerDisabled}
              className="min-w-0 flex-1 bg-card border-2 border-foreground rounded-lg px-3 md:px-4 py-2 font-mono text-sm md:text-lg shadow-[2px_2px_0px_0px_#1E293B] md:shadow-pop truncate cursor-pointer text-left disabled:cursor-default"
            >
              {address}
            </button>
            <button onClick={onCopy} className="btn-primary !py-2 !px-3 md:!px-4 text-xs md:text-sm whitespace-nowrap">
              {copied ? '✓ Copied!' : '⎘ Copy'}
            </button>
          </div>
        </div>
      </div>

      <PickerModal
        open={showPicker && !pickerDisabled}
        title="Select Address"
        items={history}
        keyOf={h => h.address}
        labelOf={h => h.address}
        isLocked={h => lockedAddresses.has(h.address)}
        onSelect={entry => {
          setShowPicker(false)
          if (entry.address !== address) onSwitch(entry)
        }}
        onCancel={() => setShowPicker(false)}
        renderActions={entry => {
          const locked = lockedAddresses.has(entry.address)
          return (
            <>
              <button
                onClick={e => { e.stopPropagation(); onToggleLock(entry.address) }}
                className="p-1 rounded hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
                title={locked ? 'Unlock' : 'Lock'}
              >
                {locked ? <LockOpen size={14} /> : <Lock size={14} />}
              </button>
              {!locked && (
                <button
                  onClick={e => { e.stopPropagation(); onDeleteHistory(entry.address) }}
                  className="p-1 rounded hover:bg-border text-muted-foreground hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash size={14} />
                </button>
              )}
            </>
          )
        }}
      />
    </>
  )
}
