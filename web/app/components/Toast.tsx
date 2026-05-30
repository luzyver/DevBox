'use client'

import { useEffect, useState } from 'react'

interface ToastItem {
  id: string
  message: string
}

export function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 left-4 right-4 md:top-auto md:left-auto md:bottom-4 md:right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-card border-2 border-foreground rounded-xl shadow-pop transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
      }`}
    >
      <span className="w-6 h-6 bg-quaternary rounded-full flex items-center justify-center text-white text-xs">✉</span>
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground ml-2">✕</button>
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  function addToast(message: string) {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message }])
  }

  function dismissToast(id: string) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return { toasts, addToast, dismissToast }
}
