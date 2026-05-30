'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ConnectionState, MessageSummary } from './types'
import { fetchInbox } from './api'

const POLL_INTERVAL = 5_000

interface UseRealtimeInboxReturn {
  messages: MessageSummary[]
  loading: boolean
  error: string | null
  connectionState: ConnectionState
  refresh: () => void
  removeMessage: (id: string) => void
  newMessageIds: Set<string>
}

export function useRealtimeInbox(address: string): UseRealtimeInboxReturn {
  const [messages, setMessages] = useState<MessageSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connected')
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set())

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const knownIds = useRef<Set<string>>(new Set())
  const addressRef = useRef(address)
  const mountedRef = useRef(true)

  addressRef.current = address

  const mergeMessages = useCallback((incoming: MessageSummary[], markNew = false) => {
    setMessages(prev => {
      const map = new Map(prev.map(m => [m.id, m]))
      const freshIds: string[] = []
      for (const msg of incoming) {
        if (!map.has(msg.id)) {
          freshIds.push(msg.id)
          map.set(msg.id, { ...msg, isNew: markNew })
        }
      }
      if (markNew && freshIds.length > 0) {
        setNewMessageIds(prev => {
          const next = new Set(prev)
          freshIds.forEach(id => next.add(id))
          return next
        })
        setTimeout(() => {
          setNewMessageIds(prev => {
            const next = new Set(prev)
            freshIds.forEach(id => next.delete(id))
            return next
          })
        }, 5000)
      }
      knownIds.current = new Set(map.keys())
      return Array.from(map.values()).sort((a, b) => b.date - a.date)
    })
  }, [])

  const doFetch = useCallback(async (signal?: AbortSignal, isInitial = false) => {
    if (!addressRef.current) return
    try {
      if (isInitial) setLoading(true)
      const data = await fetchInbox(addressRef.current, signal)
      if (!mountedRef.current) return
      if (isInitial) {
        knownIds.current = new Set(data.map(m => m.id))
        setMessages(data.sort((a, b) => b.date - a.date))
      } else {
        mergeMessages(data, true)
      }
      setError(null)
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'AbortError') return
      if (mountedRef.current) setError('Failed to load inbox')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [mergeMessages])

  const refresh = useCallback(() => {
    doFetch(undefined, false)
  }, [doFetch])

  const removeMessage = useCallback((id: string) => {
    setMessages(prev => prev.filter(m => m.id !== id))
    knownIds.current.delete(id)
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
    knownIds.current.clear()

    doFetch(controller.signal, true).then(() => {
      if (mountedRef.current) {
        pollRef.current = setInterval(() => doFetch(), POLL_INTERVAL)
      }
    })

    return () => {
      mountedRef.current = false
      controller.abort()
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [address, doFetch])

  return { messages, loading, error, connectionState, refresh, removeMessage, newMessageIds }
}
