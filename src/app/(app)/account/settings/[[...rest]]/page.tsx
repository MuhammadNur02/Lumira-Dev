import { Suspense } from 'react'
import { UserProfile } from '@clerk/nextjs'
import { eq } from 'drizzle-orm'
import { Download } from 'lucide-react'
import { db } from '@/db/client'
import { users } from '@/db/schema'
import { AccountCard, AccountPageHeader, AccountSkeleton } from '@/components/lumira/account-page'
import { Button } from '@/components/ui/button'
import { requireUser } from '@/lib/auth'
import { getLibrary } from '@/server/account/library'
import { DeleteAccount } from './delete-account'
import { ReleaseEmails } from './release-emails'

export const metadata = { title: 'Settings' }

/** FR-BD-09. Clerk's UserProfile owns `/account/settings/*` sub-paths (security, MFA, connected accounts). */
export default function SettingsPage() {
  return (
    <>
      <AccountPageHeader
        title="Settings"
        description="Profile, sign-in methods and security are managed by Clerk. Email preferences and your data live below."
      />
      <div className="flex flex-col gap-(--bento-gap)">
        <UserProfile
          path="/account/settings"
          routing="path"
          appearance={{
            elements: {
              rootBox: 'w-full',
              cardBox: 'w-full max-w-none rounded-3xl border border-bento-border shadow-none',
            },
          }}
        />
        <Suspense fallback={<AccountSkeleton rows={1} />}>
          <Preferences />
        </Suspense>
        <AccountCard aria-labelledby="data-title">
          <div className="flex flex-col gap-1">
            <h2 id="data-title" className="text-heading-4">
              Your data
            </h2>
            <p className="text-body-sm text-pretty text-muted-foreground">
              Download your orders, masked license keys and download history as JSON.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start">
            <a href="/account/settings/export" download>
              <Download aria-hidden /> Export my data
            </a>
          </Button>
        </AccountCard>
        <AccountCard aria-labelledby="danger-title" className="border-destructive/30">
          <div className="flex flex-col gap-1">
            <h2 id="danger-title" className="text-heading-4">
              Delete account
            </h2>
            <p className="text-body-sm text-pretty text-muted-foreground">
              Removes your sign-in and Library access. Invoices remain available from Lemon Squeezy, and orders are
              retained for tax law.
            </p>
          </div>
          <DeleteAccount />
        </AccountCard>
      </div>
    </>
  )
}

async function Preferences() {
  const { userId } = await requireUser()
  const [user, library] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { releaseEmails: true } }),
    getLibrary(userId),
  ])
  const prefs = library.map((item) => ({
    slug: item.product.slug,
    name: item.product.name,
    enabled: user?.releaseEmails[item.product.slug] !== false,
  }))
  return (
    <AccountCard aria-labelledby="emails-title">
      <div className="flex flex-col gap-1">
        <h2 id="emails-title" className="text-heading-4">
          Release emails
        </h2>
        <p className="text-body-sm text-pretty text-muted-foreground">
          One email when a new version of something you own ships. Receipts, keys and billing emails are always sent.
        </p>
      </div>
      {prefs.length ? (
        <ReleaseEmails prefs={prefs} />
      ) : (
        <p className="text-body-sm text-muted-foreground">You’ll see a toggle here for each product you own.</p>
      )}
    </AccountCard>
  )
}
