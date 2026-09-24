// Generates the placeholder product art served by the fixture catalog (CONTENT_SOURCE=fixtures):
// public/fixtures/{slug}.svg, 1600×1000 (the SG §8 card-poster size).
//
// Framing follows SG §8 ("device-framed screenshot on the --stage color"): a generic browser
// window on the stage color, tight at the top and sides and bleeding off the bottom edge, so that
// bento tiles (which clip to the top of the image) show product UI rather than empty stage.
// Content is generic UI furniture: values are skeleton bars, never invented metrics, logos or
// testimonials (SG §8 art direction). Real screenshots replace these once Sanity has products.
//
// Run: pnpm gen:fixture-art
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('public/fixtures')
const C = {
  stage: '#0c0d11',
  window: '#0b0c10',
  panel: '#121319',
  panel2: '#171920',
  border: '#22242b',
  chrome: '#101116',
  text: '#f2f3f6',
  muted: '#8b909a',
  faint: '#3a3d46',
}
const SANS = "Geist, Inter, 'Segoe UI', system-ui, sans-serif"
const MONO = "'Geist Mono', ui-monospace, 'Cascadia Mono', monospace"

const products = [
  { slug: 'saas-starter', kind: 'dashboard', hue: '#6d74f5', brand: 'Acme' },
  { slug: 'lumen-ui', kind: 'components', hue: '#8b7cf6', brand: 'Lumen' },
  { slug: 'motion-primitives', kind: 'motion', hue: '#4f8ef7', brand: 'Motion' },
  { slug: 'folio', kind: 'portfolio', hue: '#c07cf2', brand: 'Folio' },
  { slug: 'launchpad', kind: 'landing', hue: '#5b9df0', brand: 'Launchpad' },
  { slug: 'docsmith', kind: 'docs', hue: '#6d74f5', brand: 'Docsmith' },
]

// ---------- primitives ----------
const rect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`
const box = (x, y, w, h, r = 14, fill = C.panel) => rect(x, y, w, h, r, fill, `stroke="${C.border}" stroke-width="1.5"`)
const bar = (x, y, w, o = 0.35, h = 10, fill = C.muted) => rect(x, y, w, h, h / 2, fill, `opacity="${o}"`)
const text = (x, y, s, size, { weight = 500, fill = C.text, anchor = 'start', font = SANS, ls = 0, o = 1 } = {}) =>
  `<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" opacity="${o}">${s}</text>`
const button = (x, y, w, label, hue, primary = true) =>
  (primary ? rect(x, y, w, 40, 10, hue) : box(x, y, w, 40, 10, C.panel2)) +
  text(x + w / 2, y + 26, label, 15, { anchor: 'middle', weight: 600, fill: primary ? '#ffffff' : C.text })

// Browser window: tight at top/sides, runs off the bottom of the canvas.
const WX = 56
const WY = 44
const WW = 1600 - WX * 2
const TOP = WY + 44 // first pixel of page content
function frame(slug, body) {
  return [
    rect(WX, WY, WW, 1100, 18, C.window, `stroke="${C.border}" stroke-width="1.5"`),
    `<path d="M${WX + 18} ${WY} h${WW - 36} a18 18 0 0 1 18 18 v26 h-${WW} v-26 a18 18 0 0 1 18 -18z" fill="${C.chrome}"/>`,
    `<line x1="${WX}" y1="${TOP}" x2="${WX + WW}" y2="${TOP}" stroke="${C.border}" stroke-width="1.5"/>`,
    ...[0, 1, 2].map((i) => `<circle cx="${WX + 24 + i * 18}" cy="${WY + 22}" r="5.5" fill="${C.faint}"/>`),
    rect(800 - 190, WY + 10, 380, 24, 12, C.panel2),
    text(800, WY + 27, `${slug}.lumira-demos.dev`, 12.5, { anchor: 'middle', font: MONO, fill: C.muted, weight: 400 }),
    `<g clip-path="url(#win)">${body}</g>`,
  ].join('')
}

// App top navigation shared by the marketing-style layouts.
function siteNav(brand, hue, links, cta) {
  const y = TOP + 40
  return [
    rect(WX + 40, y - 17, 26, 26, 7, hue),
    text(WX + 78, y + 2, brand, 18, { weight: 600 }),
    // Even 36 px gaps between labels: advance by each label's approximate rendered width.
    ...links.map((l, i) =>
      text(WX + 250 + links.slice(0, i).reduce((acc, s) => acc + s.length * 8.4 + 36, 0), y + 1, l, 15, {
        fill: C.muted,
      }),
    ),
    cta ? button(WX + WW - 40 - 132, y - 21, 132, cta, hue) : '',
    `<line x1="${WX}" y1="${TOP + 76}" x2="${WX + WW}" y2="${TOP + 76}" stroke="${C.border}" stroke-width="1"/>`,
  ].join('')
}

// ---------- compositions ----------
const bodies = {
  dashboard({ hue, brand }) {
    const SX = WX + 250 // sidebar width
    const nav = ['Overview', 'Customers', 'Billing', 'Analytics', 'Team', 'Settings']
    const kpiW = (WX + WW - 40 - (SX + 40) - 3 * 20) / 4
    const points = [60, 90, 70, 130, 115, 170, 150, 210, 190, 240, 225, 280]
    const chartX = SX + 40
    const chartW = WX + WW - 40 - chartX
    const chartBase = TOP + 560
    const pts = points.map((p, i) => `${chartX + 30 + (i * (chartW - 60)) / (points.length - 1)},${chartBase - p}`)
    return [
      rect(WX, TOP, 250, 1000, 0, C.chrome),
      `<line x1="${SX}" y1="${TOP}" x2="${SX}" y2="1000" stroke="${C.border}"/>`,
      rect(WX + 24, TOP + 28, 28, 28, 8, hue),
      text(WX + 64, TOP + 48, brand, 18, { weight: 600 }),
      ...nav.map((n, i) => {
        const y = TOP + 104 + i * 46
        return (
          (i === 0 ? rect(WX + 14, y - 26, 222, 40, 9, hue, 'opacity="0.16"') : '') +
          rect(WX + 30, y - 13, 14, 14, 4, i === 0 ? hue : C.faint) +
          text(WX + 56, y - 1, n, 15, { fill: i === 0 ? C.text : C.muted, weight: i === 0 ? 600 : 500 })
        )
      }),
      text(SX + 40, TOP + 58, 'Overview', 28, { weight: 600, ls: -0.5 }),
      text(SX + 40, TOP + 86, 'Workspace activity for the last 30 days', 15, { fill: C.muted, weight: 400 }),
      box(WX + WW - 40 - 150 - 12 - 120, TOP + 32, 150, 40, 10, C.panel2),
      text(WX + WW - 40 - 150 - 12 - 120 + 20, TOP + 57, 'Last 30 days', 14, { fill: C.muted }),
      button(WX + WW - 40 - 120, TOP + 32, 120, 'Export', hue),
      ...[0, 1, 2, 3].map((i) => {
        const x = SX + 40 + i * (kpiW + 20)
        const labels = ['Revenue', 'Active users', 'New trials', 'Conversion']
        return (
          box(x, TOP + 116, kpiW, 118) +
          text(x + 22, TOP + 150, labels[i], 14, { fill: C.muted }) +
          rect(x + 22, TOP + 172, 110 + (i % 2) * 30, 22, 6, C.text, 'opacity="0.9"') +
          rect(x + 22, TOP + 206, 64, 12, 6, i === 2 ? '#e66767' : '#23b07f', 'opacity="0.75"')
        )
      }),
      box(chartX, TOP + 256, chartW, 330),
      text(chartX + 24, TOP + 292, 'Revenue', 16, { weight: 600 }),
      ...[0, 1, 2, 3].map(
        (i) =>
          `<line x1="${chartX + 24}" x2="${chartX + chartW - 24}" y1="${chartBase - i * 70}" y2="${chartBase - i * 70}" stroke="${C.border}" stroke-dasharray="4 6"/>`,
      ),
      `<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hue}" stop-opacity="0.35"/><stop offset="1" stop-color="${hue}" stop-opacity="0"/></linearGradient></defs>`,
      `<polygon points="${chartX + 30},${chartBase} ${pts.join(' ')} ${chartX + chartW - 30},${chartBase}" fill="url(#area)"/>`,
      `<polyline points="${pts.join(' ')}" fill="none" stroke="${hue}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`,
      box(chartX, TOP + 606, chartW, 300),
      ...[0, 1, 2, 3].map((i) => {
        const y = TOP + 650 + i * 58
        return (
          rect(chartX + 24, y - 16, 32, 32, 16, C.faint) +
          bar(chartX + 72, y - 9, 170, 0.8, 9, C.text) +
          bar(chartX + 72, y + 7, 110, 0.35) +
          rect(chartX + chartW - 150, y - 12, 84, 24, 12, i === 1 ? '#d9a13a' : '#23b07f', 'opacity="0.22"') +
          bar(chartX + chartW - 360, y - 5, 120, 0.3)
        )
      }),
    ].join('')
  },

  components({ hue, brand }) {
    const col = (WW - 80 - 40) / 3
    const x0 = WX + 40
    const y0 = TOP + 250
    return [
      siteNav(brand, hue, ['Components', 'Blocks', 'Themes', 'Docs'], 'Get started'),
      text(x0, TOP + 158, 'Blocks for shadcn/ui', 44, { weight: 600, ls: -1.2 }),
      text(x0, TOP + 196, 'Heroes, pricing, dashboards. Install with one command.', 18, { fill: C.muted, weight: 400 }),
      // pricing card
      box(x0, y0, col, 440),
      text(x0 + 28, y0 + 46, 'Pro', 18, { weight: 600 }),
      rect(x0 + 28, y0 + 74, 120, 36, 8, C.text, 'opacity="0.92"'),
      ...[0, 1, 2, 3].map(
        (i) =>
          rect(x0 + 28, y0 + 144 + i * 36, 16, 16, 8, hue, 'opacity="0.9"') +
          bar(x0 + 56, y0 + 147 + i * 36, 150 + (i % 2) * 50, 0.35),
      ),
      button(x0 + 28, y0 + 316, col - 56, 'Choose plan', hue),
      // stats + toggles card
      box(x0 + col + 20, y0, col, 210),
      text(x0 + col + 48, y0 + 44, 'Weekly usage', 16, { weight: 600 }),
      ...[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const h = [60, 90, 70, 120, 100, 140, 115][i]
        const step = (col - 56 + 12) / 7 // spans the card's inner width, 28 px padding each side
        return rect(x0 + col + 48 + i * step, y0 + 180 - h, step - 12, h, 6, hue, `opacity="${0.35 + i * 0.09}"`)
      }),
      box(x0 + col + 20, y0 + 230, col, 210),
      ...[0, 1, 2].map((i) => {
        const y = y0 + 280 + i * 54
        const on = i !== 1
        const tx = x0 + 2 * col + 20 - 28 - 48 // right-aligned inside the card's 28 px padding
        return (
          bar(x0 + col + 48, y - 5, 160, 0.45) +
          rect(tx, y - 14, 48, 28, 14, on ? hue : C.faint) +
          `<circle cx="${tx + (on ? 34 : 14)}" cy="${y}" r="10" fill="#fff"/>`
        )
      }),
      // tabs + form card
      box(x0 + 2 * (col + 20), y0, col, 440),
      rect(x0 + 2 * (col + 20) + 28, y0 + 28, col - 56, 42, 10, C.panel2),
      rect(x0 + 2 * (col + 20) + 32, y0 + 32, (col - 64) / 2, 34, 8, C.faint),
      text(x0 + 2 * (col + 20) + 32 + (col - 64) / 4, y0 + 54, 'Account', 14, { anchor: 'middle', weight: 600 }),
      text(x0 + 2 * (col + 20) + 32 + (3 * (col - 64)) / 4, y0 + 54, 'Password', 14, {
        anchor: 'middle',
        fill: C.muted,
      }),
      ...[0, 1].map(
        (i) =>
          text(x0 + 2 * (col + 20) + 28, y0 + 112 + i * 92, ['Name', 'Email'][i], 14, { fill: C.muted }) +
          box(x0 + 2 * (col + 20) + 28, y0 + 124 + i * 92, col - 56, 44, 10, C.window),
      ),
      button(x0 + 2 * (col + 20) + 28, y0 + 330, col - 56, 'Save changes', hue),
    ].join('')
  },

  motion({ hue, brand }) {
    const x0 = WX + 40
    const col = (WW - 80 - 40) / 3
    const y0 = TOP + 250
    return [
      siteNav(brand, hue, ['Primitives', 'Springs', 'Examples', 'Docs'], 'Install'),
      text(x0, TOP + 158, 'Interaction, tuned by physics', 44, { weight: 600, ls: -1.2 }),
      text(x0, TOP + 196, 'Spring-based components with reduced-motion variants built in.', 18, {
        fill: C.muted,
        weight: 400,
      }),
      box(x0, y0, col * 2 + 20, 300),
      text(x0 + 28, y0 + 44, 'Spring response', 16, { weight: 600 }),
      `<path d="M ${x0 + 40} ${y0 + 250} C ${x0 + 200} ${y0 + 250}, ${x0 + 260} ${y0 + 70}, ${x0 + 420} ${y0 + 96} S ${x0 + 640} ${y0 + 124}, ${x0 + 2 * col - 20} ${y0 + 110}" fill="none" stroke="${hue}" stroke-width="4" stroke-linecap="round"/>`,
      `<line x1="${x0 + 40}" x2="${x0 + 2 * col - 20}" y1="${y0 + 110}" y2="${y0 + 110}" stroke="${C.faint}" stroke-dasharray="6 8"/>`,
      // A single knob where the spring settles (a dot off the curve reads as sloppy to this audience).
      `<circle cx="${x0 + 2 * col - 20}" cy="${y0 + 110}" r="11" fill="${hue}"/><circle cx="${x0 + 2 * col - 20}" cy="${y0 + 110}" r="22" fill="${hue}" opacity="0.18"/>`,
      box(x0 + 2 * (col + 20), y0, col, 300),
      text(x0 + 2 * (col + 20) + 28, y0 + 44, 'Segmented', 16, { weight: 600 }),
      rect(x0 + 2 * (col + 20) + 28, y0 + 76, col - 56, 48, 12, C.panel2),
      rect(x0 + 2 * (col + 20) + 34, y0 + 82, (col - 68) / 3, 36, 9, hue),
      ...[0, 1, 2].map((i) =>
        text(x0 + 2 * (col + 20) + 34 + (i + 0.5) * ((col - 68) / 3), y0 + 106, ['Day', 'Week', 'Month'][i], 14, {
          anchor: 'middle',
          weight: 600,
          fill: i === 0 ? '#fff' : C.muted,
        }),
      ),
      rect(x0 + 2 * (col + 20) + 28, y0 + 170, col - 56, 96, 14, C.panel2),
      rect(x0 + 2 * (col + 20) + 48, y0 + 204, 150, 30, 8, C.text, 'opacity="0.9"'),
      box(x0, y0 + 320, col, 200),
      box(x0 + col + 20, y0 + 320, col, 200),
      box(x0 + 2 * (col + 20), y0 + 320, col, 200),
      ...[0, 1, 2].map(
        (i) =>
          text(x0 + i * (col + 20) + 28, y0 + 364, ['Accordion', 'Toast', 'Dialog'][i], 16, { weight: 600 }) +
          bar(x0 + i * (col + 20) + 28, y0 + 392, 180, 0.3) +
          bar(x0 + i * (col + 20) + 28, y0 + 414, 130, 0.3),
      ),
    ].join('')
  },

  portfolio({ hue, brand }) {
    const x0 = WX + 40
    const col = (WW - 80 - 40) / 3
    const y0 = TOP + 290
    const thumbs = [
      [hue, '#3b2a5c'],
      ['#e0a36b', '#5c3a2a'],
      ['#6bc4e0', '#1f3f5c'],
    ]
    return [
      siteNav(brand, hue, ['Work', 'About', 'Writing', 'Contact']),
      text(x0, TOP + 176, 'Selected work', 76, { weight: 600, ls: -2.5 }),
      text(x0, TOP + 226, 'Product design and front-end engineering, 2019 to now.', 19, { fill: C.muted, weight: 400 }),
      `<defs>${thumbs.map((t, i) => `<linearGradient id="t${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t[0]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient>`).join('')}</defs>`,
      ...[0, 1, 2].map((i) => {
        const x = x0 + i * (col + 20)
        return (
          rect(x, y0, col, 340, 16, `url(#t${i})`) +
          rect(x + 28, y0 + 240, col * 0.55, 70, 12, '#0b0c10', 'opacity="0.55"') +
          text(x, y0 + 382, ['Northwind', 'Atlas', 'Harbor'][i], 20, { weight: 600 }) +
          text(x, y0 + 408, ['Brand system', 'Mobile banking', 'Logistics app'][i], 15, { fill: C.muted, weight: 400 })
        )
      }),
    ].join('')
  },

  landing({ hue, brand }) {
    const cx = 800
    return [
      siteNav(brand, hue, ['Product', 'Pricing', 'Customers', 'Blog'], 'Start free'),
      rect(cx - 120, TOP + 118, 240, 30, 15, hue, 'opacity="0.18"'),
      text(cx, TOP + 138, 'New · Launch in a weekend', 13.5, { anchor: 'middle', fill: C.text, weight: 600 }),
      text(cx, TOP + 222, 'Launch faster.', 76, { anchor: 'middle', weight: 600, ls: -2.5 }),
      text(cx, TOP + 268, 'Everything a product launch page needs, already designed.', 20, {
        anchor: 'middle',
        fill: C.muted,
        weight: 400,
      }),
      button(cx - 170, TOP + 300, 160, 'Get started', hue),
      button(cx + 10, TOP + 300, 160, 'Live demo', hue, false),
      `<defs><radialGradient id="glow" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="${hue}" stop-opacity="0.35"/><stop offset="1" stop-color="${hue}" stop-opacity="0"/></radialGradient></defs>`,
      rect(WX + 120, TOP + 390, WW - 240, 600, 18, 'url(#glow)'),
      box(WX + 160, TOP + 420, WW - 320, 600, 16, C.panel),
      rect(WX + 160, TOP + 420, WW - 320, 40, 16, C.panel2),
      ...[0, 1, 2].map((i) =>
        box(WX + 190 + i * ((WW - 380) / 3 + 10), TOP + 490, (WW - 380) / 3 - 20, 150, 12, C.panel2),
      ),
      ...[0, 1, 2].map(
        (i) =>
          bar(WX + 214 + i * ((WW - 380) / 3 + 10), TOP + 520, 120, 0.7, 10, C.text) +
          bar(WX + 214 + i * ((WW - 380) / 3 + 10), TOP + 548, 200, 0.3) +
          bar(WX + 214 + i * ((WW - 380) / 3 + 10), TOP + 570, 160, 0.3),
      ),
    ].join('')
  },

  docs({ hue, brand }) {
    const SX = WX + 280
    const tocX = WX + WW - 260
    const lines = [
      [
        ['import', '#c792ea'],
        [' { createClient } ', C.text],
        ['from', '#c792ea'],
        [" '@docsmith/core'", '#9ece6a'],
      ],
      [],
      [
        ['const', '#c792ea'],
        [' client = ', C.text],
        ['createClient', '#7aa2f7'],
        ['({', C.text],
      ],
      [
        ['  projectId: ', C.text],
        ["'docs'", '#9ece6a'],
        [',', C.text],
      ],
      [
        ['  theme: ', C.text],
        ["'dark'", '#9ece6a'],
        [',', C.text],
      ],
      [['})', C.text]],
    ]
    return [
      rect(WX, TOP, WW, 64, 0, C.chrome),
      rect(WX + 32, TOP + 19, 26, 26, 7, hue),
      text(WX + 70, TOP + 38, brand, 18, { weight: 600 }),
      box(800 - 200, TOP + 13, 400, 38, 10, C.panel2),
      text(800 - 176, TOP + 38, 'Search documentation…', 14.5, { fill: C.muted, weight: 400 }),
      `<line x1="${WX}" y1="${TOP + 64}" x2="${WX + WW}" y2="${TOP + 64}" stroke="${C.border}"/>`,
      `<line x1="${SX}" y1="${TOP + 64}" x2="${SX}" y2="1000" stroke="${C.border}"/>`,
      ...['Introduction', 'Getting started', 'Installation', 'Configuration', 'Theming', 'Components', 'Deploy'].map(
        (n, i) => {
          const y = TOP + 116 + i * 40
          return (
            (i === 1 ? rect(WX + 18, y - 25, 242, 36, 8, hue, 'opacity="0.16"') : '') +
            text(WX + 36, y - 2, n, 15, { fill: i === 1 ? C.text : C.muted, weight: i === 1 ? 600 : 500 })
          )
        },
      ),
      text(SX + 56, TOP + 128, 'Getting started', 40, { weight: 600, ls: -1 }),
      text(SX + 56, TOP + 168, 'Install the package, create a client and publish your first page.', 18, {
        fill: C.muted,
        weight: 400,
      }),
      ...[0, 1].map((i) => bar(SX + 56, TOP + 206 + i * 26, [640, 520][i], 0.3)),
      box(SX + 56, TOP + 268, tocX - SX - 100, 220, 12, '#0e0f14'),
      rect(SX + 56, TOP + 268, tocX - SX - 100, 36, 12, C.panel2),
      text(SX + 76, TOP + 291, 'client.ts', 13, { font: MONO, fill: C.muted, weight: 400 }),
      // One <text> per line with coloured <tspan>s: tokens flow with the font's real advance widths
      // and xml:space keeps the indentation (SVG collapses whitespace by default).
      ...lines.map(
        (segments, i) =>
          `<text x="${SX + 80}" y="${TOP + 336 + i * 26}" font-family="${MONO}" font-size="16" xml:space="preserve">${segments
            .map(([s, fill]) => `<tspan fill="${fill}">${s.replace(/</g, '&lt;')}</tspan>`)
            .join('')}</text>`,
      ),
      text(SX + 56, TOP + 548, 'Next steps', 24, { weight: 600 }),
      ...[0, 1, 2].map((i) => bar(SX + 56, TOP + 580 + i * 26, [600, 560, 420][i], 0.3)),
      text(tocX, TOP + 116, 'On this page', 13, { fill: C.muted, weight: 600, ls: 0.4 }),
      ...['Install', 'Create a client', 'Publish', 'Next steps'].map((n, i) =>
        text(tocX, TOP + 150 + i * 30, n, 14.5, { fill: i === 0 ? hue : C.muted }),
      ),
    ].join('')
  },
}

function svg(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${p.brand} placeholder screenshot">
<defs>
  <radialGradient id="stageglow" cx="50%" cy="0%" r="80%"><stop offset="0" stop-color="${p.hue}" stop-opacity="0.22"/><stop offset="1" stop-color="${C.stage}" stop-opacity="0"/></radialGradient>
  <clipPath id="win"><rect x="${WX}" y="${TOP}" width="${WW}" height="${1000 - TOP}"/></clipPath>
</defs>
<rect width="1600" height="1000" fill="${C.stage}"/>
<rect width="1600" height="1000" fill="url(#stageglow)"/>
${frame(p.slug, bodies[p.kind](p))}
</svg>
`
}

fs.mkdirSync(OUT, { recursive: true })
for (const p of products) {
  fs.writeFileSync(path.join(OUT, `${p.slug}.svg`), svg(p))
  console.log('wrote', `public/fixtures/${p.slug}.svg`)
}
