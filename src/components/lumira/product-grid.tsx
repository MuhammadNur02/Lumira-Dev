import type { ProductCard as Product } from '@/lib/sanity/models'
import { cn } from '@/lib/utils'
import { SlideIn } from '@/components/motion/reveal'
import { ProductCard } from './product-card'
import { Spotlight } from './spotlight'

/** Catalog grid: 1 / 2 / 3 columns on the Bento gap. The first row's posters load eagerly. */
export function ProductGrid({
  products,
  morph = true,
  priorityCount = 0,
  className,
}: {
  products: Product[]
  morph?: boolean
  priorityCount?: number
  className?: string
}) {
  return (
    <div className={cn('relative grid gap-(--bento-gap) sm:grid-cols-2 lg:grid-cols-3', className)}>
      {products.map((p, i) => (
        <SlideIn key={p._id} index={i} direction="up" className="h-full">
          <ProductCard product={p} morph={morph} priority={i < priorityCount} className="h-full" />
        </SlideIn>
      ))}
      <Spotlight />
    </div>
  )
}
