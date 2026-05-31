'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ConnectionState, MessageSummary } from './types'
import { fetchInbox, getToken } from './api'

export function useRealtimeInbox(address: string) {
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected')
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())
  const esRef = useRef<EventSource | null>(null)
  const mountedRef = useRef(true)

  const addMessage = useCallback((msg: MessageSummary) => {
    setMessages(prev => {
      if (prev.some(m => m.id === msg.id)) return prev
      return [msg, ...prev]
    })
    setNewMessageIds(prev => {
      const next = new Set(prev)
      next.add(msg.id)
      return next
    })
    setTimeout(() => {
      setNewMessageIds(prev => {
        const next = new Set(prev)
        next.delete(msg.id)
        return next
      })
    }, 5000)
  }, [])

  const refresh = useCallback(async () => {
    if (!address) return
    try {
      const data = await fetchInbox(address)
      if (mountedRef.current) {
        setMessages(data.sort((a, b) => b.date - a.date))
        setError(null)
      }
    } catch {
      if (mountedRef.current) setError('Failed to load inbox')
    }
  }, [address])

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (!address) {
      setMessages([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setMessages([])
    setError(null)
    setLoading(true)

    // Initial fetch then connect SSE
    fetchInbox(address, controller.signal)
      .then(data => {
        if (!mountedRef.current) return
        setMessages(data.sort((a, b) => b.date - a.date))
        setError(null)
        setLoading(false)

        // Connect SSE
        const token = getToken()
        if (!token) return
        const es = new EventSource(`/api/inbox/${address}/stream?token=${token}`)
        esRef.current = es

        es.onmessage = (ev) => {
          try {
            const msg: MessageSummary = JSON.parse(ev.data)
            addMessage(msg)
          } catch { /* ignore parse errors */ }
        }
        es.onopen = () => setConnectionState('connected')
        es.onerror = () => {
          setConnectionState('reconnecting')
          // EventSource auto-reconnects
        }
      })
      .catch(e => {
        if (e?.name === 'AbortError') return
        if (mountedRef.current) {
          setError('Failed to load inbox')
          setLoading(false)
        }
      })

    return () => {
      mountedRef.current = false
      controller.abort()
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [address, addMessage])

  return { messages, loading, error, connectionState, refresh, removeMessage, newMessageIds }
}
