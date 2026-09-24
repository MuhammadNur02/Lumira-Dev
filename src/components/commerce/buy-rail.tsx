'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Library, MonitorSmartphone, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PriceTag } from '@/components/lumira/price-tag'
import { useCheckout } from '@/lib/billing/use-checkout'
import { TIER_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import { LicenseSelector, TierRadioGroup } from './license-selector'
import { isOwned, promoPrice, type Ownership, type PromoInfo, type PurchaseOption, type TierKey } from './purchase'
import { usePreconnect } from './use-preconnect'

export type BuyRailProduct = { slug: string; name: string; inAllAccess: boolean; demoOrigin: string | null }

/**
 * Sticky purchase rail (FR-SF-08): right column on desktop, a bottom bar with the safe-area inset on
 * mobile. Rendered first without ownership (static shell), then replaced by the ownership-aware
 * version streamed from the server (FR-SF-11).
 */
export function BuyRail({
  product,
  options,
  allAccess,
  ownership = null,
  promo = null,
}: {
  product: BuyRailProduct
  options: PurchaseOption[]
  allAccess: PurchaseOption | null
  ownership?: Ownership
  promo?: PromoInfo
}) {
  const defaultTier: TierKey = options.find((o) => o.tier === 'team' && !isOwned('team', ownership))
    ? 'team'
    : (options.find((o) => !isOwned(o.tier, ownership))?.tier ?? 'team')
  const [tier, setTier] = useState<TierKey>(defaultTier)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const { buy, warm, pendingVariant } = useCheckout()
  const preconnect = usePreconnect(product.demoOrigin)

  const all = allAccess ? [...options, allAccess] : options
  const selected = all.find((o) => o.tier === tier) ?? options[0]
  const price = selected ? promoPrice(selected.priceCents, promo, selected.variantId) : null
  const owned = ownership !== null
  const ownedLabel = ownership ? (ownership.viaAllAccess ? 'All-Access' : TIER_LABEL[ownership.tier]) : null
  const everythingOwned = all.every((o) => isOwned(o.tier, ownership))

  const libraryLink = (
    <Button variant="secondary" size="lg" className="w-full" asChild>
      <a href={`/account/library/${product.slug}`}>
        <Library aria-hidden /> Open in Library
      </a>
    </Button>
  )

  const previewLink = product.demoOrigin ? (
    <Button variant="outline" size="lg" className="w-full" asChild>
      <Link
        href={`/products/${product.slug}/preview?entry=pdp`}
        transitionTypes={['nav-forward']}
        onPointerEnter={preconnect}
        onFocus={preconnect}
      >
        <MonitorSmartphone aria-hidden /> Live Preview
      </Link>
    </Button>
  ) : null

  return (
    <>
      {/* Desktop rail */}
      <aside aria-label="Purchase" className="hidden lg:block">
        <div className="bento-surface sticky top-24 flex flex-col gap-5 p-6">
          <div className="flex items-center justify-between">
            <span className="eyebrow">License</span>
            {owned ? (
              <span className="rounded-full bg-success-subtle px-2.5 py-0.5 text-micro text-success">
                Owned · {ownedLabel}
              </span>
            ) : null}
          </div>
          {!everythingOwned && selected ? (
            <>
              <PriceTag
                cents={price}
                original={price !== selected.priceCents ? selected.priceCents : null}
                interval={selected.interval}
                className="text-metric"
              />
              <TierRadioGroup
                options={options}
                allAccess={allAccess}
                selected={tier}
                onSelect={(o) => setTier(o.tier)}
                ownership={ownership}
                promo={promo}
                compact
              />
              <Button
                size="lg"
                className="w-full"
                loading={pendingVariant !== null}
                loadingLabel="Starting checkout"
                onPointerEnter={warm}
                onFocus={warm}
                disabled={isOwned(selected.tier, ownership)}
                onClick={() => void buy(selected.variantId, selected.buyUrl)}
              >
                {selected.tier === 'all_access'
                  ? 'Start All-Access'
                  : owned
                    ? `Upgrade to ${TIER_LABEL[selected.tier]}`
                    : 'Buy license'}
              </Button>
            </>
          ) : null}
          {owned ? libraryLink : null}
          {previewLink}
          <div className="flex flex-col gap-2 border-t border-border pt-4 text-caption text-muted-foreground">
            {product.inAllAccess ? (
              <Link href="/all-access" className="inline-flex items-center gap-1.5 hover:text-foreground">
                <Sparkles className="size-3.5 text-brand-text" aria-hidden /> Included in All-Access
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
            ) : null}
            <span>Tax/VAT calculated at checkout.</span>
            <a href="#licenses" className="w-fit underline-offset-4 hover:text-foreground hover:underline">
              Compare licenses
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile bar: never covered, 48 px Buy, safe-area inset (SG §7.6) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border glass-bar pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex h-16 max-w-[80rem] items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-micro text-muted-foreground">
              {owned
                ? `Owned · ${ownedLabel}`
                : selected
                  ? `${selected.tier === 'all_access' ? 'All-Access' : TIER_LABEL[selected.tier]} license`
                  : ''}
            </span>
            {!owned && selected ? <PriceTag cents={price} interval={selected.interval} className="text-body" /> : null}
          </div>
          {everythingOwned ? (
            <Button size="lg" variant="secondary" asChild>
              <a href={`/account/library/${product.slug}`}>Open in Library</a>
            </Button>
          ) : (
            <Button size="lg" onClick={() => setSelectorOpen(true)} onPointerDown={warm}>
              {owned ? 'Upgrade' : 'Buy license'}
            </Button>
          )}
        </div>
      </div>
      <LicenseSelector
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        productSlug={product.slug}
        productName={product.name}
        options={options}
        allAccess={allAccess}
        ownership={ownership}
        promo={promo}
        defaultTier={tier}
        source="pdp"
      />
    </>
  )
}

export function MobileRailSpacer({ className }: { className?: string }) {
  return <div aria-hidden className={cn('h-[calc(4rem+env(safe-area-inset-bottom))] lg:hidden', className)} />
}
