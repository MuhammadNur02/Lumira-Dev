'use client'

import { useEffect, useId, useState } from 'react'
import { Check, Infinity as InfinityIcon, KeyRound } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { MotionDialog } from '@/components/ui/motion-dialog'
import { PriceTag } from '@/components/lumira/price-tag'
import { useIsMobile } from '@/hooks/use-mobile'
import { track } from '@/lib/analytics/track'
import { useCheckout } from '@/lib/billing/use-checkout'
import { formatPrice, TIER_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  activationLabel,
  isOwned,
  promoPrice,
  type Ownership,
  type PromoInfo,
  type PurchaseOption,
  type TierKey,
} from './purchase'

type Source = 'pdp' | 'preview' | 'card' | 'all_access'

/**
 * License selector (FR-CO-01, SG §6.4.3–6.4.4): a dialog on desktop and a draggable bottom sheet on
 * mobile. Opens over whatever is running (the Live Preview demo stays mounted).
 */
export function LicenseSelector({
  open,
  onOpenChange,
  productSlug,
  productName,
  options,
  allAccess,
  ownership,
  promo,
  defaultTier = 'team',
  source,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productSlug: string
  productName: string
  options: PurchaseOption[]
  allAccess: PurchaseOption | null
  ownership: Ownership
  promo: PromoInfo
  defaultTier?: TierKey
  source: Source
}) {
  const isMobile = useIsMobile()
  const all = allAccess ? [...options, allAccess] : options
  const firstAvailable = all.find((o) => !isOwned(o.tier, ownership))
  const [tier, setTier] = useState<TierKey>(
    all.some((o) => o.tier === defaultTier && !isOwned(o.tier, ownership))
      ? defaultTier
      : (firstAvailable?.tier ?? defaultTier),
  )
  const { buy, warm, pendingVariant } = useCheckout()
  const selected = all.find((o) => o.tier === tier)

  useEffect(() => {
    if (!open) return
    warm()
    track('license_selector_opened', { product_slug: productSlug, source })
  }, [open, productSlug, source, warm])

  const choose = (o: PurchaseOption) => {
    setTier(o.tier)
    track('license_tier_selected', { tier: o.tier, variant_id: o.variantId })
  }

  const body = (
    <div className="flex flex-col gap-5">
      <TierRadioGroup
        options={options}
        allAccess={allAccess}
        selected={tier}
        onSelect={choose}
        ownership={ownership}
        promo={promo}
      />
      {promo && selected && promoPrice(selected.priceCents, promo, selected.variantId) !== selected.priceCents ? (
        <p className="flex items-center gap-2 text-caption text-muted-foreground">
          <span className="rounded-full bg-brand-subtle px-2 py-0.5 font-mono text-micro text-brand-subtle-foreground">
            {promo.code}
          </span>
          applied at checkout
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          className="w-full"
          disabled={!selected || isOwned(selected.tier, ownership)}
          loading={pendingVariant !== null}
          loadingLabel="Starting checkout"
          onPointerEnter={warm}
          onClick={() => selected && void buy(selected.variantId, selected.buyUrl)}
        >
          {selected?.tier === 'all_access' ? 'Start All-Access' : 'Buy license'}
          {selected ? <span className="font-normal opacity-80">· {priceLabel(selected, promo)}</span> : null}
        </Button>
        <p className="text-center text-micro text-muted-foreground">
          Tax/VAT calculated at checkout. Secure payment by Lemon Squeezy.
        </p>
      </div>
    </div>
  )

  const title = `License ${productName}`
  const description = 'Every tier includes all releases within the purchased major version.'
  return isMobile ? (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} description={description}>
      {body}
    </BottomSheet>
  ) : (
    <MotionDialog open={open} onOpenChange={onOpenChange} title={title} description={description} size="form">
      {body}
    </MotionDialog>
  )
}

/** Radio cards for tiers + the All-Access row. Native radio semantics, keyboard arrows included. */
export function TierRadioGroup({
  options,
  allAccess,
  selected,
  onSelect,
  ownership,
  promo,
  compact = false,
}: {
  options: PurchaseOption[]
  allAccess: PurchaseOption | null
  selected: TierKey
  onSelect: (o: PurchaseOption) => void
  ownership: Ownership
  promo: PromoInfo
  compact?: boolean
}) {
  const name = useId()
  const row = (o: PurchaseOption) => {
    const owned = isOwned(o.tier, ownership)
    const price = promoPrice(o.priceCents, promo, o.variantId)
    const checked = selected === o.tier
    return (
      <label
        key={o.tier}
        className={cn(
          'relative flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background',
          checked ? 'border-foreground bg-accent/60' : 'border-border hover:bg-accent/40',
          owned && 'cursor-not-allowed opacity-60',
          o.tier === 'all_access' && !checked && 'border-dashed',
        )}
      >
        <input
          type="radio"
          name={name}
          value={o.tier}
          checked={checked}
          disabled={owned}
          onChange={() => onSelect(o)}
          className="mt-1 size-4 shrink-0 accent-[var(--foreground)]"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center justify-between gap-3">
            <span className="text-body-sm font-medium">
              {o.tier === 'all_access' ? 'All-Access Pass' : TIER_LABEL[o.tier]}
              {owned ? (
                <span className="ml-2 rounded-full bg-success-subtle px-2 py-0.5 text-micro text-success">Owned</span>
              ) : null}
            </span>
            <PriceTag
              cents={price}
              original={price !== o.priceCents ? o.priceCents : null}
              interval={o.interval}
              className="text-body-sm"
            />
          </span>
          <span className="flex items-center gap-1.5 text-caption text-muted-foreground">
            {o.activationLimit == null ? (
              <InfinityIcon className="size-3.5" aria-hidden />
            ) : (
              <KeyRound className="size-3.5" aria-hidden />
            )}
            {o.tier === 'all_access' ? 'Every asset, Team rights' : activationLabel(o.activationLimit)}
          </span>
          {!compact ? (
            <span className="flex flex-col gap-0.5">
              {o.rights.slice(0, 2).map((r) => (
                <span key={r} className="flex items-center gap-1.5 text-micro text-muted-foreground">
                  <Check className="size-3 shrink-0" aria-hidden /> {r}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </label>
    )
  }
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">License tier</legend>
      {options.map(row)}
      {allAccess ? row(allAccess) : null}
    </fieldset>
  )
}

function priceLabel(o: PurchaseOption, promo: PromoInfo) {
  const price = formatPrice(promoPrice(o.priceCents, promo, o.variantId))
  return o.interval ? `${price}/${o.interval === 'month' ? 'mo' : 'yr'}` : price
}
