import type { StackItem } from '@/lib/sanity/models'
import { BentoTile, TileEyebrow, type Span } from '../bento'
import { StackBadge } from '../stack-badge'

/** stackBadges (SG §4.4): stack marks with versions in mono. */
export function StackBadgesTile({
  eyebrow,
  title,
  stack,
  span,
}: {
  eyebrow?: string | null
  title?: string | null
  stack: StackItem[]
  span: Span
}) {
  return (
    <BentoTile span={span} className="justify-between gap-4">
      <div className="flex flex-col gap-1">
        <TileEyebrow>{eyebrow ?? 'Stack'}</TileEyebrow>
        {title ? <p className="text-body-sm text-muted-foreground">{title}</p> : null}
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
        {stack.map((s) => (
          <li key={s.slug}>
            <StackBadge item={s} />
          </li>
        ))}
      </ul>
    </BentoTile>
  )
}
