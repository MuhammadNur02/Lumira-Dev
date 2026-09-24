// Device presets & scale-to-fit (StyleGuide §7.3, FR-LP-03). Frames are generic rounded
// rectangles, never replicas of real hardware.

export type DeviceKey = 'desktop' | 'tablet' | 'mobile' | 'fit'

export const DEVICES = {
  desktop: { label: 'Desktop', w: 1440, h: 900, bezel: 0, bar: 36, radius: 12 },
  tablet: { label: 'Tablet', w: 834, h: 1194, bezel: 14, bar: 0, radius: 36 },
  mobile: { label: 'Mobile', w: 393, h: 852, bezel: 10, bar: 0, radius: 44 },
} as const

export const DEVICE_KEYS: DeviceKey[] = ['desktop', 'tablet', 'mobile', 'fit']
export const DEVICE_LABEL: Record<DeviceKey, string> = {
  desktop: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
  fit: 'Fit',
}

export type Frame = { vw: number; vh: number; scale: number; chromeX: number; chromeY: number }

/** Fractional scales blur text: snap to 1 when within 1.5 %. */
const snap = (s: number) => (s >= 0.985 ? 1 : Math.round(s * 1000) / 1000)

export function computeFrame(stage: { w: number; h: number }, key: DeviceKey, rotated: boolean, pad = 32): Frame {
  if (key === 'fit') {
    return { vw: Math.max(0, stage.w - pad * 2), vh: Math.max(0, stage.h - pad * 2), scale: 1, chromeX: 0, chromeY: 0 }
  }
  const d = DEVICES[key]
  const chromeX = d.bezel * 2
  const chromeY = d.bezel * 2 + d.bar
  const vw = rotated ? d.h : d.w
  const vh = rotated ? d.w : d.h
  const availW = Math.max(1, stage.w - pad * 2 - chromeX)
  const availH = Math.max(1, stage.h - pad * 2 - chromeY)

  if (key === 'desktop') {
    // Fit width; the frame fills the stage height and the demo scrolls inside it.
    const scale = snap(Math.min(1, availW / vw))
    return { vw, vh: Math.floor(availH / scale), scale, chromeX, chromeY }
  }
  return { vw, vh, scale: snap(Math.min(1, availW / vw, availH / vh)), chromeX, chromeY }
}

/** Outer frame box in CSS pixels. */
export const frameBox = (f: Frame) => ({ w: f.vw * f.scale + f.chromeX, h: f.vh * f.scale + f.chromeY })

/** "Mobile · 393 × 852 · 86%" status line (SG §7.2). */
export function frameLabel(key: DeviceKey, f: Frame) {
  return `${DEVICE_LABEL[key]} · ${f.vw} × ${f.vh} · ${Math.round(f.scale * 100)}%`
}

/** Spoken form for the live region (SG §7.10): "Mobile, 393 by 852, 86 percent". */
export function frameAnnouncement(key: DeviceKey, f: Frame) {
  return `${DEVICE_LABEL[key]}, ${f.vw} by ${f.vh}, ${Math.round(f.scale * 100)} percent`
}
