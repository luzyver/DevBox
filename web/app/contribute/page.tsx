'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type SubmitResult = {
  status: 'active' | 'pending'
  message: string
  mx_ok?: boolean
  a_ok?: boolean
}

export default function ContributePage() {
  const [domain, setDomain] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [error, setError] = useState('')
  const [serverIP, setServerIP] = useState('')

  useEffect(() => {
    fetch('/api/server-info').then(r => r.json()).then(d => setServerIP(d.ip)).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    setError('')

    try {
      const res = await fetch('/api/domains/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit domain')
      } else {
        setResult(data)
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const displayIP = serverIP || '...'

  return (
    <div className="min-h-screen bg-dots">
      <div className="hidden md:block fixed top-10 right-10 w-20 h-20 bg-quaternary rounded-full opacity-40 -z-10" />
      <div className="hidden md:block fixed bottom-20 left-10 w-16 h-16 bg-secondary rotate-45 opacity-30 -z-10" />

      <header className="px-4 md:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold font-[family-name:var(--font-heading)] flex items-center gap-2">
          ← Back to Inbox
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-heading)] mb-2">
            🌐 Contribute a Domain
          </h1>
          <p className="text-muted-foreground">
            Add your domain to our temporary email service. DNS is verified automatically.
          </p>
        </div>

        {/* Instructions */}
        <div className="card-sticker p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">📋 DNS Setup Instructions</h2>
          <p className="text-muted-foreground mb-4">
            Before submitting, add these DNS records to your domain:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-2 border-foreground rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-bold">Type</th>
                  <th className="px-3 py-2 text-left font-bold">Name</th>
                  <th className="px-3 py-2 text-left font-bold">Value</th>
                  <th className="px-3 py-2 text-left font-bold">Priority</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-3 py-2"><span className="bg-accent/10 text-accent font-mono px-2 py-0.5 rounded">MX</span></td>
                  <td className="px-3 py-2 font-mono">yourdomain.com</td>
                  <td className="px-3 py-2 font-mono">mail.yourdomain.com</td>
                  <td className="px-3 py-2">10</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-3 py-2"><span className="bg-quaternary/20 text-foreground font-mono px-2 py-0.5 rounded">A</span></td>
                  <td className="px-3 py-2 font-mono">mail.yourdomain.com</td>
                  <td className="px-3 py-2 font-mono">{displayIP}</td>
                  <td className="px-3 py-2">—</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-tertiary/10 border border-tertiary/30 rounded-lg text-sm">
            <strong>💡 Tip:</strong> The MX record should point to a hostname that resolves to our server IP.
            The A record on your domain should also point to our server IP. DNS propagation may take up to 48 hours.
          </div>
        </div>

        {/* Submit form */}
        <div className="card-sticker p-6">
          <h2 className="text-xl font-bold mb-4">🚀 Submit Your Domain</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="domain" className="block text-sm font-semibold mb-1">Domain</label>
              <input
                id="domain"
                type="text"
                className="input-geo"
                placeholder="example.com"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !domain.trim()}
              className="btn-primary justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying DNS...' : 'Submit Domain'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-secondary/10 border border-secondary/30 rounded-lg text-sm text-secondary">
              ❌ {error}
            </div>
          )}

          {result && (
            <div className={`mt-4 p-3 rounded-lg text-sm border ${
              result.status === 'active'
                ? 'bg-quaternary/10 border-quaternary/30 text-foreground'
                : 'bg-tertiary/10 border-tertiary/30 text-foreground'
            }`}>
              {result.status === 'active' ? (
                <p>✅ <strong>Domain activated!</strong> {result.message}</p>
              ) : (
                <>
                  <p>⏳ <strong>Pending verification.</strong> {result.message}</p>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>{result.mx_ok ? '✅' : '❌'} MX record</li>
                    <li>{result.a_ok ? '✅' : '❌'} A record</li>
                  </ul>
                  <p className="mt-2 text-muted-foreground">We check every 5 minutes. Your domain will be activated automatically once DNS is correct.</p>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
