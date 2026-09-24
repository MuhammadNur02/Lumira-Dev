import { BentoTile, TileEyebrow, type Span } from '../bento'

/** stat (SG §4.4): proportional `text-metric` value + caption label. Real figures only (SG §8). */
export function StatTile({
  eyebrow,
  value,
  label,
  span,
}: {
  eyebrow?: string | null
  value: string
  label: string
  span: Span
}) {
  return (
    <BentoTile span={span} className="min-h-[132px] justify-between gap-4 md:min-h-0">
      {eyebrow ? <TileEyebrow>{eyebrow}</TileEyebrow> : <span />}
      <div className="flex flex-col gap-1">
        <p className="text-metric md:text-metric-hero">{value}</p>
        <p className="text-caption text-pretty text-muted-foreground">{label}</p>
      </div>
    </BentoTile>
  )
}
