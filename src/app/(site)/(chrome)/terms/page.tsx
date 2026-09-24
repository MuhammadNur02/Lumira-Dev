import { buildMetadata } from '@/lib/seo'
import { LegalPage } from '../_legal/legal-page'

export const metadata = buildMetadata({
  title: 'Terms of sale',
  description: 'Terms for purchases made through Lumira and Lemon Squeezy.',
  path: '/terms',
})

export default function Page() {
  return <LegalPage slug="terms" />
}
