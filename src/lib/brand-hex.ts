/**
 * Hex equivalents of the Lumira tokens (StyleGuide §2.1, §5.10) for surfaces that cannot read CSS
 * variables: React Email templates, `next/og` images, `<meta name="theme-color">` and the Lemon
 * Squeezy overlay. Everything rendered by the app itself uses the CSS tokens in globals.css.
 *
 * This is the only module exempt from the `lumira/no-color-literals` lint rule.
 */
export const brandHex = {
  light: {
    canvas: '#f9fafc', // graphite-50
    card: '#ffffff',
    border: '#e3e5e9', // graphite-200
    text: '#090b0f', // graphite-950
    muted: '#696d76', // graphite-500
    mutedSurface: '#f3f4f7', // graphite-100
    ink: '#0f1115', // graphite-925 (primary)
    inkForeground: '#fcfcfe', // graphite-25
    link: '#4643c4', // lumen-700
  },
  dark: {
    canvas: '#06070a', // graphite-975
    card: '#0d0e12', // graphite-940
    border: '#1f2126',
    text: '#f9fafc',
    muted: '#a1a5ac',
    mutedSurface: '#191c21', // graphite-875
    ink: '#f9fafc',
    inkForeground: '#090b0f',
    link: '#b3bdfb', // lumen-300
  },
  brand: '#5856e9', // lumen-600, brand fill in both themes
  brandForeground: '#ffffff',
  glow: '#6d74f5', // lumen-500
} as const
