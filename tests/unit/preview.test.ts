import { describe, expect, it } from 'vitest'
import { computeFrame, frameAnnouncement, frameBox, frameLabel, type DeviceKey } from '@/components/preview/devices'
import { reducer, type PreviewState } from '@/components/preview/state'

const STAGES = {
  laptop: { w: 1280, h: 720 },
  wide: { w: 1920, h: 1000 },
  phone: { w: 390, h: 700 },
}

describe('computeFrame (SG §7.3)', () => {
  it.each(Object.entries(STAGES))('keeps every preset inside the %s stage', (_name, stage) => {
    for (const key of ['desktop', 'tablet', 'mobile'] as DeviceKey[]) {
      for (const rotated of [false, true]) {
        const f = computeFrame(stage, key, rotated)
        const box = frameBox(f)
        expect(box.w).toBeLessThanOrEqual(stage.w - 64 + 0.5)
        if (key !== 'desktop') expect(box.h).toBeLessThanOrEqual(stage.h - 64 + 0.5)
        expect(f.scale).toBeGreaterThan(0)
        expect(f.scale).toBeLessThanOrEqual(1)
      }
    }
  })

  it('renders the true CSS viewport and swaps it when rotated', () => {
    expect(computeFrame(STAGES.wide, 'mobile', false)).toMatchObject({ vw: 393, vh: 852 })
    expect(computeFrame(STAGES.wide, 'mobile', true)).toMatchObject({ vw: 852, vh: 393 })
    expect(computeFrame(STAGES.wide, 'tablet', true)).toMatchObject({ vw: 1194, vh: 834 })
  })

  it('fits desktop by width and lets the demo scroll inside the full stage height', () => {
    const f = computeFrame(STAGES.laptop, 'desktop', false)
    expect(f.vw).toBe(1440)
    expect(f.scale).toBeCloseTo((1280 - 64) / 1440, 2)
    expect(f.vh).toBe(Math.floor((720 - 64 - 36) / f.scale))
    expect(f.chromeY).toBe(36)
  })

  it('snaps scales within 1.5 % to exactly 1 (no blurry text)', () => {
    // mobile needs 393 + 20 wide and 852 + 20 tall; a stage 1.2 % short still renders at 1.
    const f = computeFrame({ w: 413 + 64, h: Math.ceil(872 - 10 + 64) }, 'mobile', false)
    expect(f.scale).toBe(1)
  })

  it('fills the stage with no chrome in Fit mode', () => {
    expect(computeFrame(STAGES.laptop, 'fit', false)).toEqual({ vw: 1216, vh: 656, scale: 1, chromeX: 0, chromeY: 0 })
  })

  it('formats the status line and the announcement', () => {
    const f = { vw: 393, vh: 852, scale: 0.86, chromeX: 20, chromeY: 20 }
    expect(frameLabel('mobile', f)).toBe('Mobile · 393 × 852 · 86%')
    expect(frameAnnouncement('mobile', f)).toBe('Mobile, 393 by 852, 86 percent')
  })
})

describe('player reducer (P4.03)', () => {
  const base: PreviewState = { status: 'loading', device: 'mobile', rotated: true, path: '/' }

  it('moves loading → slow → ready and ignores slow after ready', () => {
    const slow = reducer(base, { type: 'slow' })
    expect(slow.status).toBe('slow')
    const ready = reducer(slow, { type: 'ready' })
    expect(ready.status).toBe('ready')
    expect(reducer(ready, { type: 'slow' }).status).toBe('ready')
  })

  it('never fails once ready, and records the failure reason otherwise', () => {
    expect(reducer({ ...base, status: 'ready' }, { type: 'fail', reason: 'timeout' }).status).toBe('ready')
    expect(reducer(base, { type: 'fail', reason: 'timeout' })).toMatchObject({ status: 'failed', failure: 'timeout' })
  })

  it('resets rotation for desktop and fit, and only rotates handheld devices', () => {
    expect(reducer(base, { type: 'device', device: 'desktop' }).rotated).toBe(false)
    expect(reducer({ ...base, device: 'desktop', rotated: false }, { type: 'rotate' }).rotated).toBe(false)
    expect(reducer({ ...base, rotated: false }, { type: 'rotate' }).rotated).toBe(true)
  })

  it('hides under <Activity> and reloads when shown again', () => {
    const hidden = reducer({ ...base, status: 'ready' }, { type: 'hide' })
    expect(hidden.status).toBe('hidden')
    expect(reducer(hidden, { type: 'ready' }).status).toBe('hidden')
    expect(reducer(hidden, { type: 'show' }).status).toBe('loading')
  })

  it('keeps state identity when navigating to the same path', () => {
    expect(reducer(base, { type: 'navigate', path: '/' })).toBe(base)
    expect(reducer(base, { type: 'navigate', path: '/pricing' }).path).toBe('/pricing')
  })
})
