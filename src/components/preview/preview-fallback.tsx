'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ExternalLink, RotateCcw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GalleryImage } from '@/lib/sanity/models'
import type { DeviceKey } from './devices'

/**
 * Failed state (FR-LP-07, SG §7.7): screenshots for the current device from Sanity `demo.gallery`
 * plus Retry and Open in new tab.
 */
export function PreviewFallback({
  gallery,
  device,
  demoUrl,
  onRetry,
}: {
  gallery: GalleryImage[]
  device: DeviceKey
  demoUrl: string
  onRetry: () => void
}) {
  const shots = gallery.filter((g) => !g.device || g.device === (device === 'fit' ? 'desktop' : device))
  const list = shots.length ? shots : gallery
  const [index, setIndex] = useState(0)
  const shot = list[index % Math.max(list.length, 1)]

  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6">
      <div role="alert" className="flex w-full items-start gap-3 rounded-xl bg-warning-subtle p-4 text-warning">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="flex flex-1 flex-col gap-3 text-body-sm">
          <p>The live demo didn&apos;t load. You can browse screenshots or open it in a new tab.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={onRetry}>
              <RotateCcw aria-hidden /> Retry
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={demoUrl} target="_blank" rel="noopener">
                <ExternalLink aria-hidden /> Open in new tab
              </a>
            </Button>
          </div>
        </div>
      </div>
      {shot ? (
        <figure className="flex w-full flex-col items-center gap-3">
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-bento-border bg-card shadow-modal">
            <Image
              src={shot.url}
              alt={shot.alt || 'Demo screenshot'}
              fill
              sizes="(min-width: 1024px) 896px, 100vw"
              className="object-contain"
            />
          </div>
          {list.length > 1 ? (
            <figcaption className="flex items-center gap-3 font-mono text-micro text-muted-foreground tabular-nums">
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Previous screenshot"
                onClick={() => setIndex((i) => (i - 1 + list.length) % list.length)}
              >
                <ChevronLeft aria-hidden />
              </Button>
              {(index % list.length) + 1} / {list.length}
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Next screenshot"
                onClick={() => setIndex((i) => (i + 1) % list.length)}
              >
                <ChevronRight aria-hidden />
              </Button>
            </figcaption>
          ) : null}
        </figure>
      ) : null}
    </div>
  )
}
