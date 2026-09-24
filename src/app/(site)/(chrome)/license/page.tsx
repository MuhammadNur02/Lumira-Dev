import { buildMetadata } from '@/lib/seo'
import { LegalPage } from '../_legal/legal-page'

export const metadata = buildMetadata({
  title: 'License terms',
  description: 'The license tiers and what each permits.',
  path: '/license',
})

export default function Page() {
  return <LegalPage slug="license" />
}
