'use client'

import { ReactNode } from 'react'

interface Props<T> {
  open: boolean
  title: string
  items: T[]
  keyOf: (item: T) => string
  labelOf: (item: T) => string
  onSelect: (item: T) => void
  onCancel: () => void
  renderActions?: (item: T) => ReactNode
}

export function PickerModal<T>({ open, title, items, keyOf, labelOf, onSelect, onCancel, renderActions }: Props<T>) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onCancel} />
      <div className="relative bg-card border-2 border-foreground rounded-xl shadow-pop max-w-md w-full animate-pop-in max-h-[70vh] flex flex-col">
        <div className="shrink-0 p-4 md:p-5 border-b-2 border-border">
          <h3 className="text-lg font-bold font-[family-name:var(--font-heading)]">{title}</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No items available</p>
          )}
          {items.map(item => (
            <div key={keyOf(item)} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-muted transition-colors group">
              <button onClick={() => onSelect(item)} className="flex-1 text-left font-mono text-sm truncate">
                {labelOf(item)}
              </button>
              {renderActions && (
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {renderActions(item)}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="shrink-0 border-t-2 border-border p-3 flex justify-end">
          <button onClick={onCancel} className="btn-secondary !py-2 !px-4 text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
