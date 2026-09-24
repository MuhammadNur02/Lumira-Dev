import { Suspense } from 'react'
import { desc, eq } from 'drizzle-orm'
import { ArrowUpRight, BookOpen, CircleCheck, Lock, Mail, MessagesSquare, TriangleAlert } from 'lucide-react'
import { db } from '@/db/client'
import { discordLinks, licenseKeys, orders } from '@/db/schema'
import { AccountCard, AccountPageHeader, AccountSkeleton } from '@/components/lumira/account-page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { requireUser } from '@/lib/auth'
import { env } from '@/lib/env'
import { formatDate } from '@/lib/format'
import { keyLabels } from '@/server/checkout/status'
import { isVerifiedLicenseHolder } from '@/server/entitlements'
import { SupportForm } from './support-form'
import { UnlinkDiscordButton } from './unlink-discord'

export const metadata = { title: 'Support' }

const DOCS = [
  { href: '/docs', label: 'Documentation home' },
  { href: '/docs/saas-starter/installation', label: 'Install a boilerplate' },
  { href: '/docs/lumen-ui/registry', label: 'Use the component registry' },
  { href: '/license', label: 'License terms' },
  { href: '/refund-policy', label: 'Refund policy' },
]

export default function SupportPage({ searchParams }: PageProps<'/account/support'>) {
  return (
    <>
      <AccountPageHeader
        title="Support"
        description="Verified owners get the private Discord. Email works for everyone, and we reply within one business day."
      />
      <div className="grid gap-(--bento-gap) xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-(--bento-gap)">
          <Suspense fallback={<AccountSkeleton rows={1} />}>
            <DiscordCard searchParams={searchParams} />
          </Suspense>
          <Suspense fallback={<AccountSkeleton rows={1} tall />}>
            <EmailSupport />
          </Suspense>
        </div>
        <AccountCard aria-labelledby="docs-title" className="self-start">
          <div className="flex items-center gap-2">
            <BookOpen aria-hidden strokeWidth={1.75} className="size-5 text-muted-foreground" />
            <h2 id="docs-title" className="text-heading-4">
              Docs shortcuts
            </h2>
          </div>
          <ul className="flex flex-col gap-2 text-body-sm">
            {DOCS.map((d) => (
              <li key={d.href}>
                <a className="text-brand-text underline-offset-4 hover:underline" href={d.href}>
                  {d.label}
                </a>
              </li>
            ))}
          </ul>
        </AccountCard>
      </div>
    </>
  )
}

/** FR-GS-05 states: linked · eligible · not eligible · error (P6.09). */
async function DiscordCard({ searchParams }: { searchParams: PageProps<'/account/support'>['searchParams'] }) {
  const [{ userId }, params] = await Promise.all([requireUser(), searchParams])
  const [link, eligible] = await Promise.all([
    db.query.discordLinks.findFirst({ where: eq(discordLinks.userId, userId) }),
    isVerifiedLicenseHolder(userId),
  ])
  const outcome = typeof params.discord === 'string' ? params.discord : null
  const linked = link?.status === 'active'

  return (
    <AccountCard aria-labelledby="discord-title">
      <div className="flex flex-wrap items-center gap-2">
        <MessagesSquare aria-hidden strokeWidth={1.75} className="size-5 text-muted-foreground" />
        <h2 id="discord-title" className="text-heading-4">
          Lumira Discord
        </h2>
        {linked ? (
          <Badge variant="success">
            <CircleCheck aria-hidden /> Verified Owner
          </Badge>
        ) : null}
      </div>

      {outcome === 'error' || outcome === 'rate-limited' ? (
        <p className="flex items-start gap-2 text-body-sm text-destructive" role="alert">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {outcome === 'rate-limited'
            ? 'Too many attempts. Wait a few minutes, then try again.'
            : `We couldn’t connect your Discord account. Try again, or email ${env.SUPPORT_EMAIL} and mention code DC-OAUTH.`}
        </p>
      ) : null}

      {linked ? (
        <>
          <p className="text-body-sm text-pretty text-muted-foreground">
            Linked as{' '}
            <span className="font-medium text-foreground">{link.discordUsername ?? 'your Discord account'}</span> since{' '}
            {formatDate(link.grantedAt)}. The role stays while you hold an active license.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a
                href={`https://discord.com/channels/${env.DISCORD_GUILD_ID}/${env.DISCORD_WELCOME_CHANNEL_ID}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Discord <ArrowUpRight aria-hidden />
              </a>
            </Button>
            <UnlinkDiscordButton />
          </div>
        </>
      ) : eligible ? (
        <>
          <p className="text-body-sm text-pretty text-muted-foreground">
            Private channels for verified license holders: help from the team, release previews and show-and-tell. We
            ask Discord only for your username and permission to add you to the server.
          </p>
          <Button asChild variant="brand" className="self-start">
            <a href="/api/discord/connect">{outcome === 'error' ? 'Try again' : 'Join Discord'}</a>
          </Button>
        </>
      ) : (
        <>
          <p className="flex items-start gap-2 text-body-sm text-pretty text-muted-foreground">
            <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
            The Lumira Discord is for verified license holders. Buy any product to join.
          </p>
          <Button asChild variant="outline" className="self-start">
            <a href="/boilerplates">Browse the catalog</a>
          </Button>
        </>
      )}
    </AccountCard>
  )
}

async function EmailSupport() {
  const { userId } = await requireUser()
  const [orderRows, keyRows] = await Promise.all([
    db
      .select({ id: orders.id, number: orders.orderNumber, at: orders.createdAt })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(20),
    db
      .select({ id: licenseKeys.id, short: licenseKeys.keyShort, lsProductId: licenseKeys.lsProductId })
      .from(licenseKeys)
      .where(eq(licenseKeys.userId, userId))
      .orderBy(desc(licenseKeys.createdAt))
      .limit(20),
  ])
  const labels = await keyLabels(keyRows.map((k) => k.lsProductId))
  return (
    <AccountCard aria-labelledby="email-title">
      <div className="flex items-center gap-2">
        <Mail aria-hidden strokeWidth={1.75} className="size-5 text-muted-foreground" />
        <h2 id="email-title" className="text-heading-4">
          Email support
        </h2>
      </div>
      <SupportForm
        orders={orderRows.map((o) => ({ value: o.id, label: `#${o.number} · ${formatDate(o.at)}` }))}
        keys={keyRows.map((k) => ({
          value: k.id,
          label: `${labels.get(k.lsProductId) ?? 'License'} · ••••${k.short.slice(-4)}`,
        }))}
      />
    </AccountCard>
  )
}
