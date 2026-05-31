'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Globe, ArrowLeft, CheckCircle } from '@phosphor-icons/react'

export default function DomainsPage() {
  const [domains, setDomains] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/domains')
      .then(r => r.json())
      .then(d => setDomains((d.domains as string).split(',').filter(Boolean).sort()))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-dots">
      <header className="px-4 md:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold font-[family-name:var(--font-heading)] flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Inbox
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Globe className="w-10 h-10 text-accent" weight="duotone" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-heading)] mb-2">
            Available Domains
          </h1>
          <p className="text-muted-foreground">
            All active domains you can use for temporary email.
          </p>
        </div>

        <div className="card-sticker p-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : (
            <ul className="space-y-3">
              {domains.map(d => (
                <li key={d} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <CheckCircle className="w-5 h-5 text-quaternary shrink-0" weight="duotone" />
                  <span className="font-mono font-medium">{d}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-sm text-muted-foreground text-center">
            {domains.length} domain{domains.length !== 1 ? 's' : ''} active. Want to add yours?{' '}
            <Link href="/contribute" className="text-accent font-medium hover:underline">Contribute a domain</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
