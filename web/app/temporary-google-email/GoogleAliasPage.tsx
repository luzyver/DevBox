'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowsClockwise,
  Check,
  Copy,
  EnvelopeSimple,
  GoogleLogo,
  Trash,
} from '@phosphor-icons/react'
import { claimGoogleAlias, deleteEmail } from '../components/api'
import { EmptyInboxState } from '../components/EmptyInboxState'
import { ErrorState } from '../components/ErrorState'
import { MessageDetailPanel } from '../components/MessageDetailPanel'
import { MessageList } from '../components/MessageList'
import { MessageSummary } from '../components/types'
import { useRealtimeInbox } from '../components/use-realtime-inbox'

const CONFIGURED_BASE_EMAIL = process.env.NEXT_PUBLIC_GOOGLE_BASE_EMAIL?.trim().toLowerCase() || ''
const STORAGE_KEY = 'google_alias_history'
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

function normalizeBaseEmail(value: string) {
  return value.trim().toLowerCase()
}

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
  const { local, domain } = splitEmail(normalizeBaseEmail(baseEmail))
  if (!local || !domain) return ''
  return `${local}+${randomTag()}@${domain}`
}

export function GoogleAliasPage() {
  const [baseEmail, setBaseEmail] = useState(CONFIGURED_BASE_EMAIL)
  const [alias, setAlias] = useState('')
  const [activeAlias, setActiveAlias] = useState('')
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [selected, setSelected] = useState<MessageSummary | null>(null)
  const [claiming, setClaiming] = useState(false)

  const normalizedBase = useMemo(() => normalizeBaseEmail(baseEmail), [baseEmail])
  const configured = CONFIGURED_BASE_EMAIL.length > 0
  const canGenerate = configured && normalizedBase.includes('@')
  const isGmail = normalizedBase.endsWith('@gmail.com') || normalizedBase.endsWith('@googlemail.com')
  const { messages, loading, error, refresh, removeMessage, newMessageIds } = useRealtimeInbox(activeAlias)

  useEffect(() => {
    if (CONFIGURED_BASE_EMAIL) {
      const firstAlias = makeAlias(CONFIGURED_BASE_EMAIL)
      setAlias(firstAlias)
      activateAlias(firstAlias)
    }
    setHistory(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  }, [])

  function saveHistory(nextAlias: string) {
    setHistory(prev => {
      const next = [nextAlias, ...prev.filter(item => item !== nextAlias)].slice(0, 12)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  function generate() {
    if (!canGenerate) return
    const nextAlias = makeAlias(baseEmail)
    if (!nextAlias) return
    setAlias(nextAlias)
    setCopied(false)
    saveHistory(nextAlias)
    activateAlias(nextAlias)
  }

  async function copyAddress(value = alias) {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
    saveHistory(value)
    activateAlias(value)
  }

  async function activateAlias(value: string) {
    setClaiming(true)
    try {
      await claimGoogleAlias(value)
      setActiveAlias(value)
      setSelected(null)
    } finally {
      setClaiming(false)
    }
  }

  async function handleDelete(id: string) {
    await deleteEmail(activeAlias, id)
    removeMessage(id)
    if (selected?.id === id) setSelected(null)
  }

  function clearHistory() {
    localStorage.removeItem(STORAGE_KEY)
    setHistory([])
  }

  return (
    <div className="min-h-screen bg-dots flex flex-col">
      <header className="border-b-2 border-foreground bg-card">
        <div className="px-4 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <Link href="/" className="text-lg font-bold font-[family-name:var(--font-heading)] flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Inbox
          </Link>
          <div className="flex items-center gap-2 font-extrabold font-[family-name:var(--font-heading)]">
            <img src="/icon.png" alt="DevBox" className="w-8 h-8" />
            <span className="text-2xl leading-none">Dev<span className="text-accent">Box</span></span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-6 py-6 md:py-10">
        <div className="max-w-3xl mx-auto space-y-5">
          <section className="card-sticker p-5 md:p-7">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-muted border-2 border-foreground flex items-center justify-center shrink-0">
                <GoogleLogo className="w-7 h-7 text-accent" weight="duotone" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl md:text-4xl font-bold font-[family-name:var(--font-heading)] leading-tight">
                  Temporary Google Email
                </h1>
                <p className="text-muted-foreground mt-2">
                  Alias Gmail dari satu email induk. Semua email tetap masuk ke mailbox induk.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <label className="text-sm font-bold" htmlFor="base-email">Email tumbal</label>
              <input
                id="base-email"
                className="input-geo font-mono"
                value={baseEmail}
                onChange={event => setBaseEmail(event.target.value)}
                onBlur={() => setBaseEmail(normalizedBase)}
                placeholder="Set NEXT_PUBLIC_GOOGLE_BASE_EMAIL"
                inputMode="email"
                disabled={!configured}
              />
              {!configured ? (
                <p className="text-sm font-medium text-secondary">
                  NEXT_PUBLIC_GOOGLE_BASE_EMAIL belum diset. Set env frontend dan rebuild web untuk mengaktifkan fitur ini.
                </p>
              ) : !isGmail && (
                <p className="text-sm font-medium text-secondary">
                  Plus-addressing paling umum dipakai di Gmail. Pastikan domain email induk mendukung format plus.
                </p>
              )}
            </div>

            <div className="mt-5 rounded-lg border-2 border-foreground bg-muted/60 p-4 md:p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Temporary alias</p>
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <p className="font-mono text-lg md:text-2xl font-bold break-all flex-1">{alias}</p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={generate} disabled={!canGenerate} className="btn-secondary !rounded-lg !px-4 !py-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Generate alias">
                    <ArrowsClockwise className="w-5 h-5" weight="bold" />
                    Generate
                  </button>
                  <button onClick={() => copyAddress()} disabled={!alias} className="btn-primary !rounded-lg !px-4 !py-2 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Copy alias">
                    {copied ? <Check className="w-5 h-5" weight="bold" /> : <Copy className="w-5 h-5" weight="bold" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="card-sticker p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold font-[family-name:var(--font-heading)]">History</h2>
              <button
                onClick={clearHistory}
                disabled={history.length === 0}
                className="btn-secondary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Clear history"
              >
                <Trash className="w-4 h-4" weight="bold" />
                Clear
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-muted-foreground">Belum ada alias tersimpan.</p>
            ) : (
              <div className="space-y-2">
                {history.map(item => (
                  <button
                    key={item}
                    onClick={() => {
                      setAlias(item)
                      activateAlias(item)
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-lg bg-muted/50 border-2 border-border px-3 py-2 text-left hover:border-accent"
                  >
                    <span className="font-mono text-sm break-all">{item}</span>
                    <EnvelopeSimple className="w-4 h-4 shrink-0 text-accent" weight="bold" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="card-sticker p-5 min-h-[360px]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold font-[family-name:var(--font-heading)]">Alias Inbox</h2>
                <p className="text-sm text-muted-foreground break-all">
                  {activeAlias || 'Generate an alias to open its inbox'}
                </p>
              </div>
              <button
                onClick={refresh}
                disabled={!activeAlias || claiming}
                className="btn-secondary !rounded-lg !px-3 !py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowsClockwise className="w-4 h-4" weight="bold" />
                Refresh
              </button>
            </div>

            <div className="grid md:grid-cols-[320px_1fr] gap-4 min-h-[280px]">
              <div className={`min-h-[280px] ${selected ? 'hidden md:block' : 'block'}`}>
                {claiming || loading ? (
                  <p className="text-muted-foreground">Loading...</p>
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

              <div className={`min-h-[280px] ${!selected ? 'hidden md:block' : 'block'}`}>
                {selected ? (
                  <MessageDetailPanel message={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
                ) : (
                  <div className="h-full rounded-lg border-2 border-border bg-muted/40 flex items-center justify-center p-6 text-center text-muted-foreground">
                    Select an email to read
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
