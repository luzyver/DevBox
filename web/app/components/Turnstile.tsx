'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (id: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

export function useTurnstile() {
  const [showModal, setShowModal] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const resolveRef = useRef<((token: string) => void) | null>(null)

  useEffect(() => {
    if (!showModal || !SITE_KEY) return
    const interval = setInterval(() => {
      if (window.turnstile && containerRef.current && !widgetId.current) {
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => {
            resolveRef.current?.(token)
            resolveRef.current = null
            setShowModal(false)
            if (widgetId.current && window.turnstile) {
              window.turnstile.remove(widgetId.current)
              widgetId.current = null
            }
          },
        })
        clearInterval(interval)
      }
    }, 100)
    return () => {
      clearInterval(interval)
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current)
        widgetId.current = null
      }
    }
  }, [showModal])

  const getToken = useCallback((): Promise<string> => {
    setShowModal(true)
    return new Promise((resolve) => { resolveRef.current = resolve })
  }, [])

  const TurnstileModal = showModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-xl flex flex-col items-center gap-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Verify you&apos;re human</p>
        <div ref={containerRef} />
      </div>
    </div>
  ) : null

  return { getToken, TurnstileModal, enabled: !!SITE_KEY }
}
