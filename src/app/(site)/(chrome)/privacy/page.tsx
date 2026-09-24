import { buildMetadata } from '@/lib/seo'
import { LegalPage } from '../_legal/legal-page'

export const metadata = buildMetadata({
  title: 'Privacy policy',
  description: 'What personal data Lumira processes and why.',
  path: '/privacy',
})

export default function Page() {
  return <LegalPage slug="privacy" />
}
