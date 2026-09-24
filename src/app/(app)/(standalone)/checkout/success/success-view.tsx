'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import {
  ArrowUpRight,
  BookOpen,
  CircleCheck,
  Library,
  LoaderCircle,
  Mail,
  MessagesSquare,
  Receipt,
  Terminal,
} from 'lucide-react'
import type { CheckoutStatus } from '@/server/checkout/status'
import { DownloadButton } from '@/components/commerce/download-button'
import { BentoGrid, BentoTile, TileEyebrow, TileTitle } from '@/components/lumira/bento'
import { CopyButton } from '@/components/lumira/copy-button'
import { LicenseKey } from '@/components/lumira/license-key'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics/track'
import { formatMoney, LINE_LABEL, TIER_LABEL } from '@/lib/format'
import { spring } from '@/lib/motion/springs'

type Detailed = Extract<CheckoutStatus, { order: unknown }>

/** 1 s, 2 s, 4 s … capped at 30 s (P5.15). */
const delay = (attempt: number) => Math.min(1000 * 2 ** attempt, 30_000)
const SLOW_AFTER_MS = 90_000

export function SuccessView({ cs }: { cs: string }) {
  const [state, setState] = useState<CheckoutStatus>({ status: 'pending' })
  const [slow, setSlow] = useState(false)
  const tracked = useRef(false)

  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true
      track('checkout_success_client', { cs_id: cs })
    }
    let cancelled = false
    let timer: number | undefined
    const started = Date.now()

    async function poll(attempt: number) {
      try {
        const res = await fetch(`/api/checkout/status?cs=${encodeURIComponent(cs)}`, { cache: 'no-store' })
        const body = (await res.json()) as CheckoutStatus
        if (cancelled) return
        if (body.status !== 'pending') return setState(body)
      } catch {
        // transient network error: keep polling on the same schedule
      }
      if (cancelled) return
      if (Date.now() - started > SLOW_AFTER_MS) setSlow(true)
      timer = window.setTimeout(() => poll(attempt + 1), delay(attempt))
    }
    void poll(0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [cs])

  return (
    <div className="mx-auto flex max-w-[72rem] flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={'order' in state ? 'detailed' : state.status}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={spring.smooth}
          className="flex flex-col gap-10"
        >
          {'order' in state ? (
            <Details data={state} />
          ) : state.status === 'completed' ? (
            <ConfirmedElsewhere />
          ) : state.status === 'unknown' ? (
            <Unknown />
          ) : (
            <Pending slow={slow} />
          )}
        </m.div>
      </AnimatePresence>
    </div>
  )
}

function Pending({ slow }: { slow: boolean }) {
  return (
    <header className="flex flex-col gap-4" aria-live="polite">
      <span className="inline-flex items-center gap-2 eyebrow">
        <LoaderCircle aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" /> Confirming payment
      </span>
      <h1 className="max-w-[22ch] text-display-lg text-balance">Finalizing your order…</h1>
      <p className="max-w-[45rem] text-body-lg text-pretty text-muted-foreground">
        {slow
          ? 'This is taking longer than usual. Your payment is safe: as soon as Lemon Squeezy confirms it, your license key and download link arrive by email. You can keep this page open.'
          : 'Lemon Squeezy is confirming your payment. This usually takes a few seconds.'}
      </p>
      <div className="mt-4 grid gap-(--bento-gap) md:grid-cols-3" aria-hidden>
        <div className="h-40 skeleton-shimmer rounded-3xl md:col-span-2" />
        <div className="h-40 skeleton-shimmer rounded-3xl" />
      </div>
    </header>
  )
}

function ConfirmedElsewhere() {
  return (
    <header className="flex flex-col gap-4">
      <span className="inline-flex items-center gap-2 eyebrow text-success">
        <CircleCheck aria-hidden className="size-3.5" /> Order confirmed
      </span>
      <h1 className="max-w-[22ch] text-display-lg text-balance">You’re all set.</h1>
      <p className="max-w-[45rem] text-body-lg text-pretty text-muted-foreground">
        We’ve emailed your license key and download link. For your security, order details only appear in the browser
        that completed the checkout.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link prefetch={false} href="/account/library">
            <Library aria-hidden /> Open your Library
          </Link>
        </Button>
      </div>
    </header>
  )
}

function Unknown() {
  return (
    <header className="flex flex-col gap-4">
      <span className="eyebrow">Checkout</span>
      <h1 className="max-w-[22ch] text-display-lg text-balance">We couldn’t find this checkout.</h1>
      <p className="max-w-[45rem] text-body-lg text-pretty text-muted-foreground">
        If you completed a purchase, your license key and download link are in your email. Still stuck? Contact{' '}
        <a className="text-brand-text underline underline-offset-4" href="mailto:support@lumira.dev">
          support@lumira.dev
        </a>{' '}
        and mention code CO-404.
      </p>
    </header>
  )
}

function Details({ data }: { data: Detailed }) {
  const firstKey = data.keys.find((k) => k.value)?.value
  return (
    <>
      <header className="flex flex-col gap-4">
        <span className="inline-flex items-center gap-2 eyebrow text-success">
          <CircleCheck aria-hidden className="size-3.5" /> Order #{data.order.number}
        </span>
        <h1 className="max-w-[22ch] text-display-lg text-balance">You’re all set.</h1>
        <p className="max-w-[45rem] text-body-lg text-pretty text-muted-foreground">
          Your license key and download are below, and we’ve emailed them to you too.
        </p>
      </header>

      <BentoGrid spotlight={false} className="md:auto-rows-auto">
        <BentoTile span={{ md: 6, lg: 8 }} as="section" aria-labelledby="keys-title" className="gap-5">
          <div className="flex flex-col gap-1">
            <TileEyebrow>License</TileEyebrow>
            <TileTitle id="keys-title" size="sm">
              {data.keys.length > 1 ? 'Your license keys' : 'Your license key'}
            </TileTitle>
          </div>
          {data.keys.length ? (
            <ul className="flex flex-col gap-4">
              {data.keys.map((key) => (
                <li key={key.id} className="flex flex-col gap-2">
                  <span className="text-body-sm font-medium">{key.label}</span>
                  {key.value ? (
                    <LicenseKey value={key.value} last4={key.last4} status={key.status} />
                  ) : (
                    <LicenseKey id={key.id} last4={key.last4} status={key.status} />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 text-body-sm text-muted-foreground" aria-live="polite">
              <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
              Your key is being issued. It will appear in your email and Library within a minute.
            </p>
          )}
        </BentoTile>

        <BentoTile span={{ md: 6, lg: 4 }} as="section" aria-labelledby="receipt-title" className="gap-4">
          <div className="flex items-center gap-2">
            <Receipt aria-hidden strokeWidth={1.75} className="size-5 text-muted-foreground" />
            <TileTitle id="receipt-title" size="sm">
              Receipt
            </TileTitle>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body-sm">
            <dt className="text-muted-foreground">Total</dt>
            <dd className="text-right font-medium tabular-nums">{formatMoney(data.order.totalUsd)}</dd>
            <dt className="text-muted-foreground">Sent to</dt>
            <dd className="ph-no-capture truncate text-right">{data.order.email}</dd>
          </dl>
          {data.order.receiptUrl ? (
            <Button asChild variant="outline" size="sm" className="mt-auto self-start">
              <a href={data.order.receiptUrl} target="_blank" rel="noopener noreferrer">
                View invoice <ArrowUpRight aria-hidden />
              </a>
            </Button>
          ) : null}
          <p className="text-caption text-muted-foreground">
            Payments, tax and invoicing are handled by Lemon Squeezy, our Merchant of Record.
          </p>
        </BentoTile>

        <BentoTile span={{ md: 6, lg: 12 }} as="section" aria-labelledby="downloads-title" className="gap-5">
          <div className="flex flex-col gap-1">
            <TileEyebrow>Downloads</TileEyebrow>
            <TileTitle id="downloads-title" size="sm">
              Get the source
            </TileTitle>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {data.downloads.map((item) => (
              <li
                key={item.productId}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-caption text-muted-foreground">
                    {LINE_LABEL[item.line]}
                    {item.tier ? ` · ${TIER_LABEL[item.tier]} license` : ''}
                  </span>
                </div>
                {item.release ? (
                  <DownloadButton
                    releaseId={item.release.id}
                    version={item.release.version}
                    sizeBytes={item.release.sizeBytes}
                    productSlug={item.productSlug}
                    channel="success_page"
                  />
                ) : (
                  <span className="text-body-sm text-muted-foreground">
                    First release coming soon. We’ll email you.
                  </span>
                )}
              </li>
            ))}
            {!data.downloads.length ? (
              <li className="text-body-sm text-muted-foreground">
                Your downloads are being prepared. Refresh in a moment, or use the link in your email.
              </li>
            ) : null}
          </ul>
        </BentoTile>

        <BentoTile span={{ md: 6, lg: 8 }} as="section" aria-labelledby="next-title" className="gap-5">
          <TileTitle id="next-title" size="sm">
            Next steps
          </TileTitle>
          <ol className="grid gap-4 md:grid-cols-3">
            <li className="flex flex-col gap-2">
              <Terminal aria-hidden strokeWidth={1.75} className="size-5 text-muted-foreground" />
              <span className="font-medium">Activate</span>
              <div className="ph-no-capture flex items-center gap-1 rounded-lg border border-bento-border bg-muted/60 py-1 pr-1 pl-3">
                <code className="min-w-0 flex-1 truncate font-mono text-[13px]">npx lumira@latest activate</code>
                <CopyButton
                  label="Copy activate command"
                  value={
                    firstKey
                      ? `LUMIRA_LICENSE_KEY=${firstKey} npx lumira@latest activate`
                      : 'npx lumira@latest activate'
                  }
                />
              </div>
            </li>
            <li className="flex flex-col gap-2">
              <BookOpen aria-hidden strokeWidth={1.75} className="size-5 text-muted-foreground" />
              <span className="font-medium">Read the docs</span>
              <Link
                prefetch={false}
                className="text-body-sm text-brand-text underline-offset-4 hover:underline"
                href={'/docs' as Route}
              >
                Installation, structure and deployment →
              </Link>
            </li>
            <li className="flex flex-col gap-2">
              <MessagesSquare aria-hidden strokeWidth={1.75} className="size-5 text-muted-foreground" />
              <span className="font-medium">Join the Discord</span>
              <Link
                prefetch={false}
                className="text-body-sm text-brand-text underline-offset-4 hover:underline"
                href="/account/support"
              >
                Verified-owner channels →
              </Link>
            </li>
          </ol>
        </BentoTile>

        <BentoTile
          span={{ md: 6, lg: 4 }}
          tone="inverse"
          as="section"
          aria-labelledby="account-title"
          className="gap-4"
        >
          {data.signedIn ? (
            <Library aria-hidden strokeWidth={1.5} className="size-6" />
          ) : (
            <Mail aria-hidden strokeWidth={1.5} className="size-6" />
          )}
          <TileTitle id="account-title" size="sm">
            {data.signedIn ? 'It’s in your Library' : 'Your Library is ready'}
          </TileTitle>
          <p className="text-body-sm opacity-80">
            {data.signedIn
              ? 'Every future version, your keys and activations live in your Library.'
              : 'We’ve emailed you a sign-in link. Your Library keeps every future version, your keys and activations.'}
          </p>
          <Button asChild variant="secondary" className="mt-auto self-start">
            <Link prefetch={false} href="/account/library">
              Open your Library
            </Link>
          </Button>
        </BentoTile>
      </BentoGrid>
    </>
  )
}
