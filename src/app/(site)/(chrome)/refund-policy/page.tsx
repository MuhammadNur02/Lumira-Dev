import { buildMetadata } from '@/lib/seo'
import { LegalPage } from '../_legal/legal-page'

export const metadata = buildMetadata({
  title: 'Refund policy',
  description: 'When and how Lumira purchases can be refunded.',
  path: '/refund-policy',
})

export default function Page() {
  return <LegalPage slug="refund-policy" />
}
