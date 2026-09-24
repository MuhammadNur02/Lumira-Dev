import { ImageResponse } from 'next/og'
import { brandHex } from '@/lib/brand-hex'

export const OG_SIZE = { width: 1200, height: 630 }

/** Geist from Google Fonts for `next/og`; falls back to the default font if unreachable. */
async function geist(weight: 400 | 600): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=Geist:wght@${weight}&display=swap`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; lumira-og)' },
      })
    ).text()
    const url = css.match(/src: url\((.+?)\) format\('(?:woff2|truetype|opentype|woff)'\)/)?.[1]
    return url ? await (await fetch(url)).arrayBuffer() : null
  } catch {
    return null
  }
}

/**
 * Lumira OG card (SG §8, NFR-SEO-02): dark canvas with the top-left hero glow; eyebrow, display
 * title, tagline, price and version pill on the left; the product shot on the right when available.
 */
export async function ogCard({
  eyebrow,
  title,
  subtitle,
  price,
  version,
  image,
}: {
  eyebrow: string
  title: string
  subtitle?: string | null
  price?: string | null
  version?: string | null
  image?: string | null
}) {
  const [regular, semibold] = await Promise.all([geist(400), geist(600)])
  const c = brandHex.dark
  const fonts = [
    ...(regular ? [{ name: 'Geist', data: regular, weight: 400 as const }] : []),
    ...(semibold ? [{ name: 'Geist', data: semibold, weight: 600 as const }] : []),
  ]
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: c.canvas,
        backgroundImage: `radial-gradient(60% 60% at 10% 0%, ${brandHex.glow}55, transparent 70%)`,
        color: c.text,
        fontFamily: 'Geist',
        padding: 64,
        gap: 48,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 28, fontWeight: 600 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: c.text, display: 'flex' }} />
          Lumira
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: 20, letterSpacing: 3, textTransform: 'uppercase', color: c.muted }}>{eyebrow}</div>
          <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2.5, lineHeight: 1 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 28, color: c.muted, lineHeight: 1.35 }}>{subtitle}</div> : null}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 26 }}>
          {price ? <div style={{ fontWeight: 600 }}>{price}</div> : null}
          {version ? (
            <div
              style={{
                border: `1px solid ${c.border}`,
                background: c.mutedSurface,
                borderRadius: 10,
                padding: '4px 12px',
                fontSize: 22,
              }}
            >
              v{version}
            </div>
          ) : null}
        </div>
      </div>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- satori renders plain <img>
        <img
          src={image}
          alt=""
          width={460}
          height={500}
          style={{ objectFit: 'cover', borderRadius: 24, border: `1px solid ${c.border}` }}
        />
      ) : null}
    </div>,
    { ...OG_SIZE, fonts: fonts.length ? fonts : undefined },
  )
}
