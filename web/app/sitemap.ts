import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://d-box.tech'

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/domains`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/contribute`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
  ]
}
