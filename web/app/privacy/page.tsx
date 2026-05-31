'use client'

import Link from 'next/link'
import { ArrowLeft, ShieldCheck, Database, Eye, Clock, HardDrives, UserMinus } from '@phosphor-icons/react'

const sections = [
  {
    icon: Database,
    title: 'What We Store',
    content: 'We only store incoming emails temporarily (up to 72 hours). No user accounts, no personal data, no cookies beyond what is technically necessary.',
  },
  {
    icon: Clock,
    title: 'Data Retention',
    content: 'All emails are automatically and permanently deleted after 72 hours. There is no backup or recovery mechanism.',
  },
  {
    icon: Eye,
    title: 'No Tracking',
    content: 'We do not use analytics, tracking pixels, or third-party scripts that monitor user behavior. We do not log IP addresses.',
  },
  {
    icon: UserMinus,
    title: 'No Registration',
    content: 'DevBox does not require sign-up or login. No personal information is collected to use the service.',
  },
  {
    icon: HardDrives,
    title: 'Infrastructure',
    content: 'Emails are stored in-memory (Redis) with automatic TTL expiry. The service runs on infrastructure we control. Web traffic is proxied through Cloudflare.',
  },
  {
    icon: ShieldCheck,
    title: 'Anti-Spam',
    content: 'We use Cloudflare Turnstile to prevent automated abuse. This is a privacy-preserving challenge that does not track users across sites.',
  },
]

export default function PrivacyPage() {
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
            <ShieldCheck className="w-10 h-10 text-accent" weight="duotone" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-heading)] mb-2">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            How DevBox handles your data. TL;DR: we don&apos;t collect it.
          </p>
        </div>

        <div className="space-y-4">
          {sections.map(({ icon: Icon, title, content }, i) => (
            <div key={i} className="card-sticker p-5">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-accent shrink-0 mt-0.5" weight="duotone" />
                <div>
                  <h2 className="font-bold text-lg mb-1">{title}</h2>
                  <p className="text-muted-foreground">{content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Last updated: May 2026. Questions? Reach out via the domains listed on this service.
        </p>
      </main>
    </div>
  )
}
