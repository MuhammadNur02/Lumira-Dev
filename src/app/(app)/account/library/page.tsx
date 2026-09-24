import { Suspense } from 'react'
import { Library } from 'lucide-react'
import { AccountPageHeader, AccountSkeleton } from '@/components/lumira/account-page'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { requireUser } from '@/lib/auth'
import { getAllProducts } from '@/lib/sanity/fetchers'
import { getLibrary, onboardingProgress } from '@/server/account/library'
import { LibraryTile } from './library-tile'
import { Onboarding } from './onboarding'
import { WelcomeToast } from './welcome-toast'

export const metadata = { title: 'Library' }

export default function LibraryPage() {
  return (
    <>
      <AccountPageHeader title="Library" description="Everything you own, with every version your license covers." />
      <Suspense fallback={<AccountSkeleton rows={2} tall />}>
        <LibraryContent />
      </Suspense>
      <Suspense>
        <WelcomeToast />
      </Suspense>
    </>
  )
}

async function LibraryContent() {
  const { userId } = await requireUser()
  const [items, cards] = await Promise.all([getLibrary(userId), getAllProducts()])

  if (!items.length) {
    return (
      <Empty className="bento-surface py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Library aria-hidden strokeWidth={1.5} />
          </EmptyMedia>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>Your purchases will appear in this Library, with every future version.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <a href="/boilerplates">Browse the catalog</a>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const progress = await onboardingProgress(userId)
  const bySlug = new Map(cards.map((c) => [c.slug, c]))
  return (
    <>
      <Onboarding {...progress} docsHref={`/docs/${items[0]!.product.slug}`} />
      <ul id="library-grid" className="grid gap-(--bento-gap) md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, i) => (
          <LibraryTile key={item.product.id} item={item} card={bySlug.get(item.product.slug)} priority={i < 2} />
        ))}
      </ul>
    </>
  )
}
