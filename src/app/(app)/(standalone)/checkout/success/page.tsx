import Link from 'next/link'
import { z } from 'zod'
import { ErrorState } from '@/components/lumira/error-state'
import { Button } from '@/components/ui/button'
import { SuccessView } from './success-view'

export const metadata = { title: 'Order confirmed' }

/**
 * Lemon Squeezy redirects here with `?cs=<checkout session>` (FR-CO-06). Everything order-specific
 * is fetched client-side from `/api/checkout/status`, which is the only place allowed to set the
 * guest-scope cookie.
 */
export default async function CheckoutSuccessPage({ searchParams }: PageProps<'/checkout/success'>) {
  const cs = z.uuid().safeParse((await searchParams).cs)
  if (!cs.success) {
    return (
      <ErrorState
        code="Checkout"
        title="We couldn’t find this checkout."
        body="The link is missing its checkout reference. If you completed a purchase, your license key and download link are in your email."
        actions={
          <Button asChild>
            <Link prefetch={false} href="/account/library">
              Open your Library
            </Link>
          </Button>
        }
      />
    )
  }
  return <SuccessView cs={cs.data} />
}
