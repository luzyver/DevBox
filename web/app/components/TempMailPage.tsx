'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSummary } from './types'
import { deleteEmail, fetchDomains, generateInbox, setToken } from './api'
import { useRealtimeInbox } from './use-realtime-inbox'
import { useTurnstile } from './Turnstile'
import { EnvelopeSimple } from '@phosphor-icons/react'
import { InboxToolbar } from './InboxToolbar'
import { InboxAddressCard } from './InboxAddressCard'
import { MessageList } from './MessageList'
import { MessageDetailPanel } from './MessageDetailPanel'
import { EmptyInboxState } from './EmptyInboxState'
import { ErrorState } from './ErrorState'
import { SkeletonList } from './SkeletonList'
import { SkeletonDetail } from './SkeletonDetail'
import { ToastContainer, useToast } from './Toast'
import { ConfirmModal } from './ConfirmModal'

export function TempMailPage() {
  const [domains, setDomains] = useState<string[]>([])
  const [domain, setDomain] = useState('')
  const [address, setAddress] = useState('')
  const [selected, setSelected] = useState<MessageSummary | null>(null)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<{address: string, token: string}[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [pendingDomain, setPendingDomain] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const prevCountRef = useRef(0)
  const { toasts, addToast, dismissToast } = useToast()
  const { getToken: getTurnstileToken, TurnstileModal, enabled: turnstileEnabled } = useTurnstile()

  const { messages, loading, error, connectionState, refresh, removeMessage, newMessageIds } =
    useRealtimeInbox(address)

  // Load domains
  useEffect(() => {
    const controller = new AbortController()
    fetchDomains(controller.signal).then(list => {
      setDomains(list)
      setDomain(list[0])
    })
    return () => controller.abort()
  }, [])

  // Restore or generate on domain ready
  useEffect(() => {
    if (!domain) return
    const savedHistory = JSON.parse(localStorage.getItem('inbox_history') || '[]')
    setHistory(savedHistory)
    const saved = localStorage.getItem('inbox_address')
    const savedToken = localStorage.getItem('inbox_token')
    if (saved && savedToken) {
      const matchedDomain = domains.find(d => saved.endsWith(`@${d}`))
      if (matchedDomain) {
        setToken(savedToken)
        setAddress(saved)
        setDomain(matchedDomain)
        return
      }
    }
    if (!address) {
      generateNew()
    }
  }, [domain])

  // Toast on new messages
  useEffect(() => {
    if (messages.length > prevCountRef.current && prevCountRef.current >= 0 && !loading) {
      const diff = messages.length - prevCountRef.current
      if (diff > 0 && prevCountRef.current > 0) {
        addToast(`${diff} new email${diff > 1 ? 's' : ''} received`)
      }
    }
    prevCountRef.current = messages.length
  }, [messages.length, loading])

  function saveToHistory(addr: string, token: string) {
    setHistory(prev => {
      const filtered = prev.filter(h => h.address !== addr)
      const next = [{ address: addr, token }, ...filtered].slice(0, 10)
      localStorage.setItem('inbox_history', JSON.stringify(next))
      return next
    })
  }

  async function generateNew() {
    if (!domain) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    const cfToken = turnstileEnabled ? await getTurnstileToken() : undefined
    const { address: addr, token } = await generateInbox(domain, cfToken)
    localStorage.setItem('inbox_address', addr)
    localStorage.setItem('inbox_token', token)
    saveToHistory(addr, token)
    setAddress(addr)
    setSelected(null)
    prevCountRef.current = 0
  }

  function handleNewInbox() {
    if (address) {
      setShowNewModal(true)
    } else {
      generateNew()
    }
  }

  function switchToAddress(entry: { address: string, token: string }) {
    setToken(entry.token)
    localStorage.setItem('inbox_address', entry.address)
    localStorage.setItem('inbox_token', entry.token)
    setAddress(entry.address)
    setSelected(null)
    prevCountRef.current = 0
    const matchedDomain = domains.find(d => entry.address.endsWith(`@${d}`))
    if (matchedDomain) setDomain(matchedDomain)
  }

  function handleDomainChange(d: string) {
    if (address) {
      setPendingDomain(d)
      setShowNewModal(true)
    } else {
      setDomain(d)
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = useCallback(async (id: string) => {
    setDeleteTarget(id)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      await deleteEmail(address, deleteTarget)
      removeMessage(deleteTarget)
      if (selected?.id === deleteTarget) setSelected(null)
    } catch { /* silent */ }
    setDeleteTarget(null)
  }, [address, deleteTarget, selected, removeMessage])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-dots">
      {/* Decorative shapes */}
      <div className="hidden md:block fixed top-10 left-10 w-20 h-20 bg-tertiary rounded-full opacity-40 -z-10" />
      <div className="hidden md:block fixed bottom-20 right-10 w-16 h-16 bg-secondary rotate-45 opacity-30 -z-10" />
      <div className="hidden md:block fixed top-1/3 right-20 w-12 h-12 bg-quaternary rounded-full opacity-30 -z-10" />

      <InboxToolbar
        domains={domains}
        domain={domain}
        onDomainChange={handleDomainChange}
        onNewInbox={handleNewInbox}
        connectionState={connectionState}
      />

      <InboxAddressCard address={address} history={history} onCopy={handleCopy} onSwitch={switchToAddress} copied={copied} />

      {TurnstileModal}

      <main className="flex-1 min-h-0 px-4 md:px-6 py-4 md:py-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full">
          {/* Inbox list */}
          <div className={`w-full md:w-[380px] md:shrink-0 flex flex-col min-h-0 ${selected ? 'hidden md:flex' : 'flex'}`}>
            <div className="flex items-center justify-between mb-3 md:mb-4 shrink-0">
              <h2 className="text-lg font-bold font-[family-name:var(--font-heading)]">
                Inbox
                {messages.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-6 h-6 bg-secondary text-white text-xs font-bold rounded-full">
                    {messages.length}
                  </span>
                )}
              </h2>
              <button onClick={refresh} className="text-muted-foreground hover:text-accent text-sm font-medium">
                Refresh
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {loading ? (
                <SkeletonList />
              ) : error ? (
                <ErrorState message={error} onRetry={refresh} />
              ) : messages.length === 0 ? (
                <EmptyInboxState />
              ) : (
                <MessageList
                  messages={messages}
                  selectedId={selected?.id ?? null}
                  newMessageIds={newMessageIds}
                  onSelect={setSelected}
                />
              )}
            </div>
          </div>

          {/* Reader panel */}
          <div className={`flex-1 min-w-0 min-h-0 ${!selected ? 'hidden md:block' : 'block'}`}>
            {selected ? (
              <MessageDetailPanel message={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
            ) : loading ? (
              <SkeletonDetail />
            ) : (
              <div className="h-full flex items-center justify-center card-sticker p-12">
                <div className="text-center">
                  <div className="w-24 h-24 bg-tertiary/20 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <EnvelopeSimple className="w-10 h-10 text-tertiary" weight="duotone" />
                  </div>
                  <h3 className="text-xl font-bold font-[family-name:var(--font-heading)] mb-2">Select an email to read</h3>
                  <p className="text-muted-foreground">Choose a message from the inbox on the left</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="shrink-0 border-t-2 border-border py-3 px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} DevBox. Disposable email service.</p>
        <nav className="flex items-center gap-4">
          <a href="/domains" className="hover:text-accent font-medium">Domains</a>
          <a href="/faq" className="hover:text-accent font-medium">FAQ</a>
          <a href="/privacy" className="hover:text-accent font-medium">Privacy</a>
          <a href="/contribute" className="hover:text-accent font-medium">Contribute</a>
        </nav>
      </footer>

      <ConfirmModal
        open={showNewModal}
        title="Generate New Inbox?"
        message="Current inbox will still be accessible from history."
        confirmLabel="Generate"
        onConfirm={() => {
          setShowNewModal(false)
          if (pendingDomain) {
            setDomain(pendingDomain)
            setPendingDomain(null)
            localStorage.removeItem('inbox_address')
            localStorage.removeItem('inbox_token')
          }
          generateNew()
        }}
        onCancel={() => { setShowNewModal(false); setPendingDomain(null) }}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Email?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
