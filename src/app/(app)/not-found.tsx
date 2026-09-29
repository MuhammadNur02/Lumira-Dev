import Link from 'next/link'
import { ErrorState } from '@/components/lumira/error-state'
import { Button } from '@/components/ui/button'

/**
 * `notFound()` anywhere under the (app) root layout: account assets the buyer doesn't own, unknown
 * admin records, and non-admins probing /admin. Deliberately generic, so it never hints at why.
 */
export default function AppNotFound() {
  return (
    <main id="main">
      <ErrorState
        code="404"
        title="This page moved, or never existed."
        body="The link may be out of date, or it points to something that isn’t part of your account."
        actions={
          <>
            <Button size="lg" asChild>
              <Link href="/account/library">Open your Library</Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/">Back to the store</Link>
            </Button>
          </>
        }
      />
    </main>
  )
}
