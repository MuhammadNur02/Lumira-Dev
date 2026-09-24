// scripts/generate-spring-easings.mjs
// Emits the :root spring tokens and the matching Tailwind `ease-spring-*` utilities.
// Usage: node scripts/generate-spring-easings.mjs > src/styles/springs.css
const SPRINGS = {
  snappy: { stiffness: 500, damping: 32, mass: 0.8 },
  smooth: { stiffness: 300, damping: 30, mass: 1 },
  gentle: { stiffness: 170, damping: 26, mass: 1 },
}

/** Closed-form position (0 → 1) of a damped spring released from rest. */
function springAt(t, { stiffness: k, damping: c, mass: m }) {
  const w0 = Math.sqrt(k / m)
  const zeta = c / (2 * Math.sqrt(k * m))
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta)
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
  }
  if (zeta === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t)
  const s = w0 * Math.sqrt(zeta * zeta - 1)
  const r1 = -zeta * w0 + s
  const r2 = -zeta * w0 - s
  return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1)
}

function toCssLinear(spec, { rest = 0.005, samples = 80, tolerance = 0.004 } = {}) {
  let T = 0
  for (let t = 0; t < 3; t += 0.0005) if (Math.abs(1 - springAt(t, spec)) > rest) T = t
  const pts = Array.from({ length: samples + 1 }, (_, i) => [
    i / samples,
    i === samples ? 1 : springAt((T * i) / samples, spec),
  ])
  const rdp = (p) => {
    if (p.length < 3) return p
    const [a, b] = [p[0], p.at(-1)]
    let dmax = 0
    let idx = 0
    for (let i = 1; i < p.length - 1; i++) {
      const d =
        Math.abs((b[1] - a[1]) * p[i][0] - (b[0] - a[0]) * p[i][1] + b[0] * a[1] - b[1] * a[0]) /
        Math.hypot(b[1] - a[1], b[0] - a[0])
      if (d > dmax) {
        dmax = d
        idx = i
      }
    }
    return dmax > tolerance ? [...rdp(p.slice(0, idx + 1)).slice(0, -1), ...rdp(p.slice(idx))] : [a, b]
  }
  const stops = rdp(pts).map(([x, y], i, arr) =>
    i === 0 ? '0' : i === arr.length - 1 ? '1' : `${+y.toFixed(3)} ${+(x * 100).toFixed(1)}%`,
  )
  return { duration: Math.round(T * 1000), easing: `linear(${stops.join(', ')})` }
}

const lines = [':root {']
for (const [name, spec] of Object.entries(SPRINGS)) {
  const { duration, easing } = toCssLinear(spec)
  lines.push(`  --spring-${name}-duration: ${duration}ms;`, `  --spring-${name}: ${easing};`)
}
lines.push('}', '@theme inline {')
for (const name of Object.keys(SPRINGS)) lines.push(`  --ease-spring-${name}: var(--spring-${name});`)
lines.push('}')
console.log(lines.join('\n'))
