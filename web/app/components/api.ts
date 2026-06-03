import { MessageSummary } from './types'

let currentToken: string | null = null

export function setToken(token: string) {
  currentToken = token
}

export async function generateInbox(domain: string, turnstileToken?: string): Promise<{ address: string; token: string }> {
  const res = await fetch('/api/inbox/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, turnstile_token: turnstileToken }),
  })
  if (!res.ok) throw new Error('Failed to generate inbox')
  const data = await res.json()
  currentToken = data.token
  return { address: data.address, token: data.token }
}

export async function claimInbox(address: string, turnstileToken?: string): Promise<string> {
  const res = await fetch('/api/inbox/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, turnstile_token: turnstileToken }),
  })
  if (!res.ok) throw new Error('Failed to claim inbox')
  const data = await res.json()
  currentToken = data.token
  return data.token
}

export async function claimGoogleAlias(address: string): Promise<string> {
  const res = await fetch('/api/google-alias/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  })
  if (!res.ok) throw new Error('Failed to claim google alias')
  const data = await res.json()
  currentToken = data.token
  return data.token
}

export function getToken(): string | null {
  return currentToken
}

export async function fetchInbox(address: string, signal?: AbortSignal): Promise<MessageSummary[]> {
  const res = await fetch(`/api/inbox/${address}`, {
    signal,
    headers: { Authorization: `Bearer ${currentToken}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch inbox: ${res.status}`)
  const data = await res.json()
  return data || []
}

export async function fetchDomains(signal?: AbortSignal): Promise<string[]> {
  const res = await fetch('/api/domains', { signal })
  if (!res.ok) throw new Error('Failed to fetch domains')
  const data = await res.json()
  return (data.domains as string).split(',').map(d => d.trim()).filter(Boolean)
}

export async function deleteEmail(address: string, id: string): Promise<void> {
  const res = await fetch(`/api/inbox/${address}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${currentToken}` },
  })
  if (!res.ok) throw new Error('Failed to delete email')
}
