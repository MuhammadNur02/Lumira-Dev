import Image, { type ImageProps } from 'next/image'
import type { ImageRef } from '@/lib/sanity/models'
import { cn } from '@/lib/utils'

type Props = Omit<ImageProps, 'src' | 'alt' | 'width' | 'height' | 'placeholder' | 'blurDataURL'> & {
  image: ImageRef
  dark?: ImageRef | null
  alt?: string
}

/**
 * Light/dark product media (SG §2.4). With a dark variant both render, toggled by `dark:hidden` /
 * `hidden dark:block`, and both lazy-load; above-the-fold heroes pass no `dark`, so exactly one
 * LCP image downloads.
 */
export function ThemedImage({ image, dark, alt, className, fill, ...props }: Props) {
  const common = {
    ...props,
    ...(fill ? { fill: true } : { width: image.width, height: image.height }),
    placeholder: image.lqip ? ('blur' as const) : ('empty' as const),
    blurDataURL: image.lqip ?? undefined,
  }
  if (!dark) return <Image src={image.url} alt={alt ?? image.alt} className={className} {...common} />
  return (
    <>
      <Image
        src={image.url}
        alt={alt ?? image.alt}
        className={cn('dark:hidden', className)}
        loading="lazy"
        {...common}
      />
      <Image
        src={dark.url}
        alt={alt ?? dark.alt}
        className={cn('hidden dark:block', className)}
        loading="lazy"
        {...common}
      />
    </>
  )
}
