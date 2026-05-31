'use client'

import Link from 'next/link'
import { ArrowLeft, Question, Clock, ShieldCheck, Globe, Trash, EnvelopeSimple } from '@phosphor-icons/react'

const faqs = [
  {
    icon: EnvelopeSimple,
    q: 'What is DevBox?',
    a: 'DevBox is a free disposable temporary email service. Use it to receive emails without revealing your real address — perfect for sign-ups, verifications, and testing.',
  },
  {
    icon: Clock,
    q: 'How long are emails stored?',
    a: 'Emails are automatically deleted after 72 hours. There is no way to recover them after expiry.',
  },
  {
    icon: ShieldCheck,
    q: 'Is it private?',
    a: 'Yes. We don\'t require registration, don\'t track users, and don\'t log IP addresses. Emails are stored temporarily in memory and auto-expire.',
  },
  {
    icon: Trash,
    q: 'Can I delete emails manually?',
    a: 'Yes. Click the delete button on any email to remove it immediately.',
  },
  {
    icon: Globe,
    q: 'Can I use my own domain?',
    a: 'Yes! Visit the Contribute page to add your domain. You only need to set an MX record pointing to our server.',
  },
  {
    icon: EnvelopeSimple,
    q: 'Can I send emails?',
    a: 'No. DevBox is receive-only. You cannot send or reply to emails.',
  },
]

export default function FaqPage() {
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
            <Question className="w-10 h-10 text-accent" weight="duotone" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-heading)] mb-2">
            FAQ
          </h1>
          <p className="text-muted-foreground">
            Frequently asked questions about DevBox.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map(({ icon: Icon, q, a }, i) => (
            <div key={i} className="card-sticker p-5">
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 text-accent shrink-0 mt-0.5" weight="duotone" />
                <div>
                  <h2 className="font-bold text-lg mb-1">{q}</h2>
                  <p className="text-muted-foreground">{a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
