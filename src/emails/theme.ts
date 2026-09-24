import type { CSSProperties } from 'react'
import { brandHex } from '@/lib/brand-hex'

// Email clients read neither OKLCH nor CSS variables: hex equivalents from StyleGuide §5.10.
const c = brandHex.light
export const fontSans = "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
export const fontMono = "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

export const body: CSSProperties = { backgroundColor: c.canvas, fontFamily: fontSans, margin: 0, padding: '24px 0' }
export const container: CSSProperties = { maxWidth: 600, margin: '0 auto', padding: 32 }
export const h1: CSSProperties = { fontSize: 22, lineHeight: '28px', fontWeight: 600, color: c.text, margin: '0 0 8px' }
export const h2: CSSProperties = {
  fontSize: 18,
  lineHeight: '24px',
  fontWeight: 600,
  color: c.text,
  margin: '4px 0 16px',
}
export const text: CSSProperties = { fontSize: 15, lineHeight: '24px', color: c.text, margin: '0 0 16px' }
export const muted: CSSProperties = { ...text, color: c.muted }
export const eyebrow: CSSProperties = {
  fontFamily: fontMono,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: c.muted,
  margin: 0,
}
export const card: CSSProperties = {
  backgroundColor: c.card,
  border: `1px solid ${c.border}`,
  borderRadius: 16,
  padding: 24,
  margin: '0 0 16px',
}
export const primaryButton: CSSProperties = {
  backgroundColor: c.ink,
  color: c.inkForeground,
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 500,
  padding: '12px 20px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '0 0 16px',
}
export const secondaryButton: CSSProperties = {
  ...primaryButton,
  backgroundColor: c.card,
  color: c.text,
  border: `1px solid ${c.border}`,
}
export const link: CSSProperties = { color: c.link, textDecoration: 'underline' }
export const code: CSSProperties = {
  fontFamily: fontMono,
  fontSize: 14,
  lineHeight: '22px',
  backgroundColor: c.mutedSurface,
  border: `1px solid ${c.border}`,
  borderRadius: 12,
  padding: '12px 16px',
  color: c.text,
  margin: '0 0 16px',
}
export const hr: CSSProperties = { borderColor: c.border, margin: '24px 0' }
export const footnote: CSSProperties = { fontSize: 13, lineHeight: '20px', color: c.muted, margin: '0 0 8px' }

/** Dark-capable clients (`prefers-color-scheme`), SG §5.10 dark column. */
export const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .l-body { background-color: ${brandHex.dark.canvas} !important; }
    .l-card { background-color: ${brandHex.dark.card} !important; border-color: ${brandHex.dark.border} !important; }
    .l-text { color: ${brandHex.dark.text} !important; }
    .l-muted { color: ${brandHex.dark.muted} !important; }
    .l-link { color: ${brandHex.dark.link} !important; }
    .l-key { background-color: ${brandHex.dark.mutedSurface} !important; border-color: ${brandHex.dark.border} !important; color: ${brandHex.dark.text} !important; }
    .l-primary { background-color: ${brandHex.dark.ink} !important; color: ${brandHex.dark.inkForeground} !important; }
  }
`
