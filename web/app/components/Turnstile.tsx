'use client'

import { useEffect, useRef, useCallback } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id: string) => void
    }
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const resolveRef = useRef<((token: string) => void) | null>(null)

  useEffect(() => {
    if (!SITE_KEY || !containerRef.current) return
    const interval = setInterval(() => {
      if (window.turnstile && containerRef.current && !widgetId.current) {
        widgetId.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => {
            tokenRef.current = token
            resolveRef.current?.(token)
            resolveRef.current = null
          },
        })
        clearInterval(interval)
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const getToken = useCallback((): Promise<string> => {
    if (tokenRef.current) {
      const t = tokenRef.current
      tokenRef.current = null
      return Promise.resolve(t)
    }
    return new Promise((resolve) => { resolveRef.current = resolve })
  }, [])

  const reset = useCallback(() => {
    tokenRef.current = null
    if (widgetId.current && window.turnstile) {
      window.turnstile.reset(widgetId.current)
    }
  }, [])

  return { containerRef, getToken, reset, enabled: !!SITE_KEY }
}
