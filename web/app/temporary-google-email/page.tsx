import type { Metadata } from 'next'
import { GoogleAliasPage } from './GoogleAliasPage'

export const metadata: Metadata = {
  title: 'Temporary Google Email',
  description:
    'Generate Gmail plus-address aliases from a configured parent mailbox, such as devbox+onljnk12@gmail.com.',
}

export default function TemporaryGoogleEmailPage() {
  return <GoogleAliasPage />
}
