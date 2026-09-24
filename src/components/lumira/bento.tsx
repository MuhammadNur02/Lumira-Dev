import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Spotlight } from './spotlight'

// StyleGuide §5.5. Literal class maps: Tailwind can only generate classes it can see in source.
export const LG_COLS = {
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  12: 'lg:col-span-12',
} as const
export const MD_COLS = { 2: 'md:col-span-2', 3: 'md:col-span-3', 4: 'md:col-span-4', 6: 'md:col-span-6' } as const
const BASE_COLS = { 2: 'col-span-2', 4: 'col-span-4' } as const
export const ROWS = { 1: 'md:row-span-1', 2: 'md:row-span-2', 3: 'md:row-span-3' } as const

export type Span = {
  base?: keyof typeof BASE_COLS
  md?: keyof typeof MD_COLS
  lg: keyof typeof LG_COLS
  rows?: keyof typeof ROWS
}

const tile = cva('group/tile bento-light bento-surface flex flex-col', {
  variants: {
    padding: { none: 'p-0', md: 'p-5 md:p-6', lg: 'p-6 md:p-8' },
    tone: {
      default: '',
      // Secondary text on the brand fill stays at brand-foreground: anything dimmer drops below 4.5:1.
      brand:
        'bg-brand text-brand-foreground [--bento-border:var(--bento-border-on-brand)] [--muted-foreground:var(--brand-foreground)]',
      inverse: 'bg-primary text-primary-foreground',
    },
    interactive: {
      true: [
        'transition-[box-shadow,border-color,translate,scale] duration-(--spring-snappy-duration) ease-spring-snappy',
        'pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:border-[color-mix(in_oklch,var(--foreground)_14%,transparent)] pointer-fine:hover:shadow-raised',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background active:scale-[0.99]',
        'motion-reduce:transition-[box-shadow,border-color] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
      ],
      false: '',
    },
  },
  defaultVariants: { padding: 'md', tone: 'default', interactive: false },
})

/** 4 / 6 / 12 columns; DOM order = visual order (R6: never `grid-auto-flow: dense`). */
export function BentoGrid({
  className,
  children,
  spotlight = true,
  ...props
}: React.ComponentProps<'div'> & { spotlight?: boolean }) {
  return (
    <div
      data-slot="bento-grid"
      className={cn(
        'grid grid-cols-4 gap-(--bento-gap) md:auto-rows-(--bento-row) md:grid-cols-6 lg:grid-cols-12',
        className,
      )}
      {...props}
    >
      {children}
      {spotlight ? <Spotlight /> : null}
    </div>
  )
}

export function BentoTile({
  span,
  className,
  padding,
  tone,
  interactive,
  as = 'article',
  ...props
}: React.ComponentProps<'article'> &
  VariantProps<typeof tile> & { span: Span; as?: 'article' | 'section' | 'div' | 'li' }) {
  // Polymorphic element; the article props are valid on every allowed tag.
  const Comp = as as 'article'
  return (
    <Comp
      data-slot="bento-tile"
      data-spotlight={interactive ? '' : undefined}
      className={cn(
        BASE_COLS[span.base ?? 4],
        span.md && MD_COLS[span.md],
        LG_COLS[span.lg],
        span.rows && ROWS[span.rows],
        tile({ padding, tone, interactive }),
        className,
      )}
      {...props}
    />
  )
}

/** Tile slots (SG §4.4). */
export function TileEyebrow({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('eyebrow', className)} {...props} />
}

export function TileTitle({
  className,
  size = 'lg',
  as: Heading = 'h3',
  ...props
}: React.ComponentProps<'h3'> & { size?: 'lg' | 'sm'; as?: 'h2' | 'h3' }) {
  return (
    <Heading
      className={cn(size === 'lg' ? 'text-heading-4 md:text-heading-3' : 'text-heading-4', 'text-balance', className)}
      {...props}
    />
  )
}

export function TileDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('line-clamp-2 text-body-sm text-pretty text-muted-foreground', className)} {...props} />
}
