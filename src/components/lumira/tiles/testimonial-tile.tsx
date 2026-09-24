import Image from 'next/image'
import type { Testimonial } from '@/lib/sanity/models'
import { BentoTile, type Span } from '../bento'

/** testimonial (SG §4.4): real, attributed quotes with written permission only. */
export function TestimonialTile({ testimonial, span }: { testimonial: Testimonial; span: Span }) {
  return (
    <BentoTile span={span} as="section" className="min-h-50 md:min-h-0">
      <figure className="flex h-full flex-col justify-between gap-6">
        <blockquote className="text-body-lg text-pretty">
          <p>“{testimonial.quote}”</p>
        </blockquote>
        <figcaption className="flex items-center gap-3">
          {testimonial.avatar ? (
            <Image
              src={testimonial.avatar.url}
              alt=""
              width={32}
              height={32}
              className="size-8 rounded-full object-cover"
            />
          ) : (
            <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-muted text-caption">
              {testimonial.name.slice(0, 1)}
            </span>
          )}
          <span className="flex flex-col">
            <span className="text-caption text-foreground">{testimonial.name}</span>
            <span className="text-micro text-muted-foreground">
              {[testimonial.role, testimonial.company].filter(Boolean).join(', ')}
            </span>
          </span>
        </figcaption>
      </figure>
    </BentoTile>
  )
}
