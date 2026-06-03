'use client'

import { useEffect, useRef, useState } from 'react'
import { EnvelopeSimple } from '@phosphor-icons/react'
import { claimGoogleAlias, deleteEmail } from '../components/api'
import { EmptyInboxState } from '../components/EmptyInboxState'
import { ErrorState } from '../components/ErrorState'
import { InboxAddressCard } from '../components/InboxAddressCard'
import { InboxToolbar } from '../components/InboxToolbar'
import { MessageDetailPanel } from '../components/MessageDetailPanel'
import { MessageList } from '../components/MessageList'
import { SkeletonDetail } from '../components/SkeletonDetail'
import { SkeletonList } from '../components/SkeletonList'
import { ToastContainer, useToast } from '../components/Toast'
import { useTurnstile } from '../components/Turnstile'
import { MessageSummary } from '../components/types'
import { useRealtimeInbox } from '../components/use-realtime-inbox'

const CONFIGURED_BASE_EMAIL = process.env.NEXT_PUBLIC_GOOGLE_BASE_EMAIL?.trim().toLowerCase() || ''
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function splitEmail(address: string) {
  const [local, domain] = address.split('@')
  return { local, domain }
}

function randomTag(length = 8) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => ALPHABET[byte % ALPHABET.length]).join('')
}

function makeAlias(baseEmail: string) {
  const { local, domain } = splitEmail(baseEmail)
  if (!local || !domain) return ''
  return `${local}+${randomTag()}@${domain}`
}

export function GoogleAliasPage() {
  const [alias, setAlias] = useState('')
  const [selected, setSelected] = useState<MessageSummary | null>(null)
  const [copied, setCopied] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const prevCountRef = useRef(0)
  const { toasts, addToast, dismissToast } = useToast()
  const { getToken: getTurnstileToken, TurnstileModal, enabled: turnstileEnabled } = useTurnstile()
  const { domain } = splitEmail(CONFIGURED_BASE_EMAIL)
  const { messages, loading, error, connectionState, refresh, removeMessage, newMessageIds } = useRealtimeInbox(alias)

  useEffect(() => {
    if (CONFIGURED_BASE_EMAIL) generateAlias()
  }, [])

  useEffect(() => {
    if (messages.length > prevCountRef.current && !loading) {
      const diff = messages.length - prevCountRef.current
      if (diff > 0 && prevCountRef.current > 0) {
        addToast(`${diff} new email${diff > 1 ? 's' : ''} received`)
      }
    }
    prevCountRef.current = messages.length
  }, [messages.length, loading])

  async function generateAlias() {
    if (!CONFIGURED_BASE_EMAIL) {
      addToast('NEXT_PUBLIC_GOOGLE_BASE_EMAIL is not configured.')
      return
    }
    const nextAlias = makeAlias(CONFIGURED_BASE_EMAIL)
    if (!nextAlias) return

    setClaiming(true)
    try {
      const cfToken = turnstileEnabled ? await getTurnstileToken() : undefined
      await claimGoogleAlias(nextAlias, cfToken)
      setAlias(nextAlias)
      setSelected(null)
      setCopied(false)
      prevCountRef.current = 0
    } catch {
      addToast('Failed to open Google alias inbox.')
    } finally {
      setClaiming(false)
    }
  }

  async function handleCopy() {
    if (!alias) return
    await navigator.clipboard.writeText(alias)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete(id: string) {
    await deleteEmail(alias, id)
    removeMessage(id)
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-dots">
      <div className="hidden md:block fixed top-10 left-10 w-20 h-20 bg-tertiary rounded-full opacity-40 -z-10" />
      <div className="hidden md:block fixed bottom-20 right-10 w-16 h-16 bg-secondary rotate-45 opacity-30 -z-10" />
      <div className="hidden md:block fixed top-1/3 right-20 w-12 h-12 bg-quaternary rounded-full opacity-30 -z-10" />

      <InboxToolbar
        domains={domain ? [domain] : []}
        domain={domain || 'gmail'}
        onDomainChange={() => {}}
        onNewInbox={generateAlias}
        connectionState={connectionState}
        domainPickerDisabled
        newLabel="New"
        showDomain={false}
      />

      <InboxAddressCard
        address={alias}
        history={[]}
        lockedAddresses={new Set()}
        onCopy={handleCopy}
        onSwitch={() => {}}
        onToggleLock={() => {}}
        onDeleteHistory={() => {}}
        copied={copied}
        pickerDisabled
        label="Google alias:"
      />

      {TurnstileModal}

      {!CONFIGURED_BASE_EMAIL && (
        <div className="shrink-0 border-b-2 border-foreground bg-muted px-4 md:px-6 py-3 text-sm font-medium text-secondary">
          NEXT_PUBLIC_GOOGLE_BASE_EMAIL belum diset. Set env frontend dan rebuild web untuk mengaktifkan fitur ini.
        </div>
      )}

      <main className="flex-1 min-h-0 px-4 md:px-6 py-4 md:py-6">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 h-full">
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
              <button onClick={refresh} disabled={!alias || claiming} className="text-muted-foreground hover:text-accent text-sm font-medium disabled:opacity-50">
                Refresh
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2">
              {claiming || loading ? (
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

          <div className={`flex-1 min-w-0 min-h-0 ${!selected ? 'hidden md:block' : 'block'}`}>
            {selected ? (
              <MessageDetailPanel message={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
            ) : claiming || loading ? (
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
        <nav className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1">
          <a href="/" className="hover:text-accent font-medium">Temp Mail</a>
          <a href="/domains" className="hover:text-accent font-medium">Domains</a>
          <a href="/faq" className="hover:text-accent font-medium">FAQ</a>
          <a href="/privacy" className="hover:text-accent font-medium">Privacy</a>
          <a href="/contribute" className="hover:text-accent font-medium">Contribute</a>
        </nav>
      </footer>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  )
}
