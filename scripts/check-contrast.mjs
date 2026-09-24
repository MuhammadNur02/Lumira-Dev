// scripts/check-contrast.mjs
// Converts the color tokens in src/app/globals.css to sRGB and asserts every pair in
// StyleGuide §2.5 (≥ 4.5 for text, ≥ 3 for UI, WCAG 2.x) for `:root` (light) and `.dark`.
// Usage: pnpm check:contrast (exits 1 when any pair fails)
import { readFileSync } from 'node:fs'

const TEXT = 4.5
const UI = 3

/** [foreground token, background token, minimum ratio] — StyleGuide §2.5 */
const PAIRS = [
  ['foreground', 'background', TEXT],
  ['foreground', 'card', TEXT],
  ['muted-foreground', 'background', TEXT],
  ['muted-foreground', 'card', TEXT],
  ['muted-foreground', 'muted', TEXT],
  ['muted-foreground', 'popover', TEXT],
  ['primary-foreground', 'primary', TEXT],
  ['brand-foreground', 'brand', TEXT],
  ['brand-text', 'background', TEXT],
  ['brand-text', 'card', TEXT],
  ['brand-subtle-foreground', 'brand-subtle', TEXT],
  ['destructive', 'card', TEXT],
  ['destructive-foreground', 'destructive', TEXT],
  ['success', 'success-subtle', TEXT],
  ['warning', 'warning-subtle', TEXT],
  ['info', 'info-subtle', TEXT],
  ['destructive', 'destructive-subtle', TEXT],
  ['input', 'card', UI],
  ['input', 'background', UI],
  ['ring', 'background', UI],
  ['ring', 'card', UI],
]

const css = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/** Custom properties declared directly in every top-level `selector { … }` block. */
function declarations(selector) {
  const vars = {}
  const block = new RegExp(`(?:^|\\n)${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`, 'g')
  for (const [, body] of css.matchAll(block)) {
    for (const [, name, value] of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) vars[name] = value.trim()
  }
  return vars
}

const light = declarations(':root')
const themes = { light, dark: { ...light, ...declarations('.dark') } }

function resolve(vars, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`circular reference in --${name}`)
  const value = vars[name]
  if (value === undefined) throw new Error(`--${name} is not defined`)
  const ref = value.match(/^var\(--([\w-]+)\)$/)
  return ref ? resolve(vars, ref[1], seen.add(name)) : value
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

/** Parses `oklch(L C H [/ A])` or `#rrggbb` into linear sRGB (clamped to the gamut) and alpha. */
function toLinearRgb(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { rgb: [n >> 16, (n >> 8) & 255, n & 255].map((c) => srgbToLinear(c / 255)), alpha: 1 }
  }
  const ok = value.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/)
  if (!ok) throw new Error(`unsupported color "${value}"`)
  const L = Number(ok[1]) / (ok[2] ? 100 : 1)
  const C = Number(ok[3])
  const h = (Number(ok[4]) * Math.PI) / 180
  const alpha = ok[5] === undefined ? 1 : Number(ok[5]) / (ok[6] ? 100 : 1)
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return { rgb: rgb.map((c) => Math.min(1, Math.max(0, c))), alpha }
}

function luminance(vars, token) {
  const value = resolve(vars, token)
  const { rgb, alpha } = toLinearRgb(value)
  if (alpha !== 1) throw new Error(`--${token} (${value}) is translucent; contrast pairs need opaque tokens`)
  const [r, g, b] = rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

let failures = 0
for (const [theme, vars] of Object.entries(themes)) {
  console.log(`\n${theme}`)
  for (const [fg, bg, min] of PAIRS) {
    const [hi, lo] = [luminance(vars, fg), luminance(vars, bg)].sort((x, y) => y - x)
    const ratio = (hi + 0.05) / (lo + 0.05)
    const pass = ratio >= min
    if (!pass) failures++
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${ratio.toFixed(2).padStart(5)} ≥ ${min}  ${fg} on ${bg}`)
  }
}

if (failures) {
  console.error(`\n${failures} contrast pair(s) below requirement (StyleGuide §2.5).`)
  process.exit(1)
}
console.log('\nAll contrast pairs pass.')
