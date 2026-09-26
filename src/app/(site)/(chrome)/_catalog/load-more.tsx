'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { SlideIn } from '@/components/motion/reveal'
import { ProductCard } from '@/components/lumira/product-card'
import type { ProductCard as Product } from '@/lib/sanity/models'
import { loadMoreProducts } from './actions'

type Filters = Omit<Parameters<typeof loadMoreProducts>[0], 'offset'>

/** Appends the next page in place; no infinite scroll (FR-SF-06). */
export function LoadMore({ filters, initialOffset }: { filters: Filters; initialOffset: number }) {
  const [items, setItems] = useState<Product[]>([])
  const [next, setNext] = useState<number | null>(initialOffset)
  const [pending, start] = useTransition()

  return (
    <>
      {items.map((p, i) => (
        <SlideIn key={p._id} index={i} direction="up" className="h-full">
          <ProductCard product={p} className="h-full" />
        </SlideIn>
      ))}
      {next !== null ? (
        <div className="col-span-full flex justify-center pt-4">
          <Button
            variant="secondary"
            size="lg"
            loading={pending}
            loadingLabel="Loading more products"
            onClick={() =>
              start(async () => {
                const res = await loadMoreProducts({ ...filters, offset: next })
                setItems((prev) => [...prev, ...res.items])
                setNext(res.next)
              })
            }
          >
            Load more
          </Button>
        </div>
      ) : null}
    </>
  )
}
