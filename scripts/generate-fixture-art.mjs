// Generates the placeholder product art served by the fixture catalog (CONTENT_SOURCE=fixtures):
// public/fixtures/{slug}.svg, 1600×1000, Lumira dark palette. Abstract UI compositions only:
// no fabricated screenshots, logos or metrics (StyleGuide §8). Run: node scripts/generate-fixture-art.mjs
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.resolve('public/fixtures')
const C = {
  canvas: '#06070a',
  card: '#0d0e12',
  surface: '#191c21',
  border: '#1f2126',
  text: '#f9fafc',
  muted: '#a1a5ac',
  brand: '#5856e9',
  glow: '#6d74f5',
}

const products = [
  { slug: 'saas-starter', name: 'SaaS Starter', kind: 'dashboard', hue: C.brand },
  { slug: 'lumen-ui', name: 'Lumen UI', kind: 'components', hue: '#7c6cf2' },
  { slug: 'motion-primitives', name: 'Motion Primitives', kind: 'motion', hue: '#4f8ef7' },
  { slug: 'folio', name: 'Folio', kind: 'portfolio', hue: '#c07cf2' },
  { slug: 'launchpad', name: 'Launchpad', kind: 'landing', hue: '#5b9df0' },
  { slug: 'docsmith', name: 'Docsmith', kind: 'docs', hue: '#6d74f5' },
]

const rect = (x, y, w, h, r, fill, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`
const line = (x, y, w, o = 0.5) => rect(x, y, w, 10, 5, C.muted, `opacity="${o}"`)

function body(kind, hue) {
  const X = 220,
    Y = 250,
    W = 1160
  switch (kind) {
    case 'dashboard':
      return [
        rect(X, Y, 220, 560, 16, C.surface),
        ...[0, 1, 2, 3, 4].map((i) => line(X + 28, Y + 40 + i * 44, 140 - i * 12, i === 0 ? 0.9 : 0.4)),
        ...[0, 1, 2].map((i) => rect(X + 250 + i * 305, Y, 285, 150, 16, C.surface)),
        ...[0, 1, 2].map(
          (i) =>
            `${line(X + 278 + i * 305, Y + 36, 90)}${rect(X + 278 + i * 305, Y + 76, 150, 34, 8, C.text, 'opacity="0.85"')}`,
        ),
        rect(X + 250, Y + 176, 915, 384, 16, C.surface),
        `<polyline fill="none" stroke="${hue}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" points="${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `${X + 290 + i * 92},${Y + 480 - [40, 90, 70, 150, 130, 200, 180, 250, 230, 290][i]}`).join(' ')}"/>`,
      ].join('')
    case 'components':
      return [0, 1, 2, 3, 4, 5]
        .map((i) => {
          const cx = X + (i % 3) * 395,
            cy = Y + Math.floor(i / 3) * 290
          return `${rect(cx, cy, 370, 265, 20, C.surface)}${line(cx + 30, cy + 34, 120, 0.8)}${rect(cx + 30, cy + 170, 140, 48, 12, i % 2 ? C.border : hue)}${line(cx + 30, cy + 80, 280, 0.35)}${line(cx + 30, cy + 104, 220, 0.35)}`
        })
        .join('')
    case 'motion':
      return [
        rect(X, Y, W, 560, 20, C.surface),
        ...[0, 1, 2, 3, 4].map(
          (i) =>
            `<circle cx="${X + 160 + i * 210}" cy="${Y + 280 + Math.sin(i) * 90}" r="${38 + i * 6}" fill="${hue}" opacity="${0.35 + i * 0.13}"/>`,
        ),
        `<path d="M ${X + 120} ${Y + 420} C ${X + 400} ${Y + 80}, ${X + 700} ${Y + 520}, ${X + 1040} ${Y + 160}" fill="none" stroke="${C.muted}" stroke-width="3" stroke-dasharray="10 12" opacity="0.6"/>`,
      ].join('')
    case 'portfolio':
      return [
        `<text x="${X}" y="${Y + 90}" font-family="Geist, Inter, system-ui, sans-serif" font-size="84" font-weight="600" fill="${C.text}" letter-spacing="-3">Selected work</text>`,
        ...[0, 1, 2].map((i) =>
          rect(X + i * 395, Y + 160, 370, 400, 20, i === 1 ? hue : C.surface, i === 1 ? 'opacity="0.8"' : ''),
        ),
      ].join('')
    case 'landing':
      return [
        `<text x="800" y="${Y + 100}" text-anchor="middle" font-family="Geist, Inter, system-ui, sans-serif" font-size="80" font-weight="600" fill="${C.text}" letter-spacing="-3">Launch faster.</text>`,
        line(600, Y + 150, 400, 0.45),
        rect(640, Y + 200, 150, 52, 14, hue),
        rect(810, Y + 200, 150, 52, 14, C.surface),
        rect(X + 80, Y + 300, W - 160, 260, 24, C.surface),
      ].join('')
    case 'docs':
      return [
        rect(X, Y, 240, 560, 16, C.surface),
        ...[0, 1, 2, 3, 4, 5, 6].map((i) => line(X + 28, Y + 36 + i * 40, 150 - (i % 3) * 30, i === 2 ? 0.95 : 0.4)),
        `<text x="${X + 290}" y="${Y + 60}" font-family="Geist, Inter, system-ui, sans-serif" font-size="46" font-weight="600" fill="${C.text}">Getting started</text>`,
        ...[0, 1, 2].map((i) => line(X + 290, Y + 100 + i * 28, 620 - i * 90, 0.4)),
        rect(X + 290, Y + 210, 870, 200, 16, C.card, `stroke="${C.border}" stroke-width="2"`),
        ...[0, 1, 2, 3].map((i) =>
          rect(
            X + 320,
            Y + 245 + i * 36,
            260 + ((i * 97) % 300),
            12,
            6,
            i === 1 ? hue : C.muted,
            `opacity="${i === 1 ? 0.9 : 0.45}"`,
          ),
        ),
      ].join('')
  }
}

function svg({ slug, name, kind, hue }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" role="img" aria-label="${name} placeholder art">
<defs>
  <radialGradient id="g" cx="50%" cy="0%" r="75%"><stop offset="0" stop-color="${hue}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.canvas}" stop-opacity="0"/></radialGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.08"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
</defs>
<rect width="1600" height="1000" fill="${C.canvas}"/>
<rect width="1600" height="1000" fill="url(#g)"/>
${rect(180, 140, 1240, 760, 28, C.card, `stroke="${C.border}" stroke-width="2"`)}
${rect(180, 140, 1240, 760, 28, 'url(#edge)')}
${[0, 1, 2].map((i) => `<circle cx="${226 + i * 26}" cy="190" r="7" fill="${C.border}"/>`).join('')}
${rect(640, 178, 320, 24, 12, C.surface)}
<text x="800" y="195" text-anchor="middle" font-family="Geist Mono, ui-monospace, monospace" font-size="13" fill="${C.muted}">${slug}.lumira-demos.dev</text>
${body(kind, hue)}
</svg>
`
}

fs.mkdirSync(OUT, { recursive: true })
for (const p of products) {
  fs.writeFileSync(path.join(OUT, `${p.slug}.svg`), svg(p))
  console.log('wrote', `public/fixtures/${p.slug}.svg`)
}
