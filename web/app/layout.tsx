import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'DevBox - Disposable Temporary Email',
    template: '%s | DevBox',
  },
  description: 'Free disposable temporary email service with multi-domain support. No registration required. Emails auto-delete after 72 hours.',
  icons: { icon: '/icon.png' },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async></script>
      </head>
      <body className="min-h-screen bg-background text-foreground" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
