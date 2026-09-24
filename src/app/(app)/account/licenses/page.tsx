import { Suspense } from 'react'
import { KeyRound, TriangleAlert } from 'lucide-react'
import { AccountCard, AccountPageHeader, AccountSkeleton } from '@/components/lumira/account-page'
import { LicenseKey } from '@/components/lumira/license-key'
import { RelativeTime } from '@/components/lumira/relative-time'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { requireUser } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { getLicenses, type LicenseCard } from '@/server/account/licenses'
import { DeactivateButton } from './deactivate-button'
import { SnippetTabs } from './snippet-tabs'

export const metadata = { title: 'Licenses' }

const SOURCE_LABEL = { cli: 'CLI', registry: 'Registry', dashboard: 'Dashboard', external: 'External' } as const

export default function LicensesPage() {
  return (
    <>
      <AccountPageHeader
        title="Licenses"
        description="Reveal and copy your keys, see where they’re activated and free a slot when you move a project."
      />
      <Suspense fallback={<AccountSkeleton rows={2} tall />}>
        <LicensesContent />
      </Suspense>
    </>
  )
}

async function LicensesContent() {
  const { userId } = await requireUser()
  const cards = await getLicenses(userId)
  if (!cards.length) {
    return (
      <Empty className="bento-surface py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <KeyRound aria-hidden strokeWidth={1.5} />
          </EmptyMedia>
          <EmptyTitle>No license keys yet</EmptyTitle>
          <EmptyDescription>
            Every purchase comes with a license key. It appears here a few seconds after checkout.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <a href="/boilerplates">Browse the catalog</a>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }
  return (
    <ul className="flex flex-col gap-(--bento-gap)">
      {cards.map((card) => (
        <li key={card.key.id}>
          <KeyCard card={card} />
        </li>
      ))}
    </ul>
  )
}

function KeyCard({ card }: { card: LicenseCard }) {
  const { key, instances } = card
  const used = instances.length
  const limit = key.activationLimit
  const titleId = `key-${key.id}`
  return (
    <AccountCard as="article" aria-labelledby={titleId}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-heading-4">
            {card.label}
          </h2>
          <p className="text-caption text-muted-foreground">
            Issued {formatDate(key.createdAt)}
            {key.expiresAt
              ? ` · ${key.status === 'expired' ? 'expired' : 'renews or expires'} ${formatDate(key.expiresAt)}`
              : ''}
          </p>
        </div>
      </div>

      <LicenseKey id={key.id} last4={key.last4} status={key.status} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-body-sm">
          <span className="font-medium">Activations</span>
          <span className="text-muted-foreground tabular-nums">
            {limit === null ? `${used} activations · unlimited` : `${used} of ${limit} activations used`}
          </span>
        </div>
        {limit !== null ? (
          <Progress value={(used / Math.max(1, limit)) * 100} aria-label={`${used} of ${limit} activations used`} />
        ) : null}
        {!card.live ? (
          <p className="flex items-center gap-1.5 text-caption text-warning">
            <TriangleAlert aria-hidden className="size-3.5" /> Showing our last known activations. Lemon Squeezy is
            unreachable right now.
          </p>
        ) : null}
      </div>

      {instances.length ? (
        <div className="-mx-5 overflow-x-auto md:-mx-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5 md:pl-6">Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Activated</TableHead>
                <TableHead>Last validated</TableHead>
                <TableHead className="pr-5 text-right md:pr-6">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances.map((instance) => (
                <TableRow key={instance.id}>
                  <TableCell className="max-w-[16rem] truncate pl-5 font-medium md:pl-6">{instance.name}</TableCell>
                  <TableCell>
                    <Badge variant="neutral">{SOURCE_LABEL[instance.source]}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(instance.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {instance.lastValidatedAt ? (
                      <RelativeTime date={instance.lastValidatedAt.toISOString()} />
                    ) : (
                      'Never'
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right md:pr-6">
                    <DeactivateButton instanceId={instance.id} name={instance.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-body-sm text-muted-foreground">
          Not activated anywhere yet. Run the CLI in your project to activate it.
        </p>
      )}

      {key.status === 'active' || key.status === 'inactive' ? (
        <SnippetTabs keyId={key.id} last4={key.last4} registry={card.registry} />
      ) : null}
    </AccountCard>
  )
}
