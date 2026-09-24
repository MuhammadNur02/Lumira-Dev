'use client'

import { Library } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  activationLabel,
  isOwned,
  promoPrice,
  type Ownership,
  type PromoInfo,
  type PurchaseOption,
  type TierKey,
} from '@/components/commerce/purchase'
import { PriceTag } from '@/components/lumira/price-tag'
import { formatPrice, TIER_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  slug: string
  options: PurchaseOption[]
  allAccess: PurchaseOption | null
  tier: TierKey
  onTierChange: (tier: TierKey) => void
  ownership: Ownership
  promo: PromoInfo
  onBuy: () => void
  starting: boolean
  unavailable?: boolean
  variant: 'toolbar' | 'bar'
}

const tierName = (t: TierKey) => (t === 'all_access' ? 'All-Access' : TIER_LABEL[t])

/**
 * Persistent Buy CTA (FR-LP-05, SG §7.6): never covered by player UI and visible at every width
 * ≥ 320 px. States: default, promo, starting, owned, unavailable.
 */
export function BuyCta({
  slug,
  options,
  allAccess,
  tier,
  onTierChange,
  ownership,
  promo,
  onBuy,
  starting,
  unavailable,
  variant,
}: Props) {
  const all = allAccess ? [...options, allAccess] : options
  const selected = all.find((o) => o.tier === tier) ?? options[0]
  const everythingOwned = all.every((o) => isOwned(o.tier, ownership))

  if (ownership && everythingOwned) {
    return (
      <div className={cn('flex items-center gap-2', variant === 'bar' && 'w-full justify-between')}>
        <span className="rounded-full bg-success-subtle px-2.5 py-1 text-micro text-success">
          Owned · {ownership.viaAllAccess ? 'All-Access' : tierName(ownership.tier)}
        </span>
        <Button variant="secondary" size={variant === 'bar' ? 'lg' : 'default'} asChild>
          <a href={`/account/library/${slug}`}>
            <Library aria-hidden /> Open in Library
          </a>
        </Button>
      </div>
    )
  }
  if (!selected) return null
  const price = promoPrice(selected.priceCents, promo, selected.variantId)

  const select = (
    <Select value={tier} onValueChange={(v) => onTierChange(v as TierKey)}>
      <SelectTrigger aria-label="License tier" className={cn(variant === 'bar' ? 'h-11' : 'h-10')}>
        <SelectValue>{tierName(tier)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" position="popper" className="z-[75] w-72">
        {all.map((o) => (
          <SelectItem key={o.tier} value={o.tier} disabled={isOwned(o.tier, ownership)}>
            <span className="flex w-full flex-col gap-0.5">
              <span className="flex items-center justify-between gap-4">
                <span className="font-medium">{o.tier === 'all_access' ? 'All-Access Pass' : tierName(o.tier)}</span>
                <span className="tabular-nums">
                  {formatPrice(promoPrice(o.priceCents, promo, o.variantId))}
                  {o.interval ? '/mo' : ''}
                </span>
              </span>
              <span className="text-micro text-muted-foreground">
                {o.tier === 'all_access' ? 'Every asset, Team rights' : activationLabel(o.activationLimit)}
                {isOwned(o.tier, ownership) ? ' · Owned' : ''}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const button = (
    <Button
      size={variant === 'bar' ? 'lg' : 'default'}
      onClick={onBuy}
      loading={starting}
      loadingLabel="Starting checkout"
      disabled={unavailable || isOwned(selected.tier, ownership)}
    >
      {ownership ? 'Upgrade' : 'Buy license'}
    </Button>
  )

  return (
    <div className={cn('flex items-center gap-2', variant === 'bar' && 'w-full')}>
      {variant === 'bar' ? <div className="min-w-0 flex-1">{select}</div> : null}
      <span className="flex items-center gap-2 whitespace-nowrap">
        <PriceTag
          cents={price}
          original={price !== selected.priceCents ? selected.priceCents : null}
          interval={selected.interval}
          className="text-[15px]"
        />
        {promo && price !== selected.priceCents ? (
          <span className="hidden rounded-full bg-brand-subtle px-2 py-0.5 font-mono text-micro text-brand-subtle-foreground sm:inline">
            {promo.code}
          </span>
        ) : null}
      </span>
      {variant === 'toolbar' ? select : null}
      {unavailable ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{button}</span>
          </TooltipTrigger>
          <TooltipContent>Checkout is temporarily unavailable</TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  )
}
