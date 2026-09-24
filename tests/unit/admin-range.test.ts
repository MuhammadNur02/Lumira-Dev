import { describe, expect, it } from 'vitest'
import { bucketFor, parseRange, rangeQuery } from '@/lib/admin/range'

const NOW = new Date('2026-09-24T15:00:00Z')

describe('admin date range (FR-AD-02)', () => {
  it('defaults to the last 30 days, inclusive, with an equal previous period', () => {
    const r = parseRange({}, NOW)
    expect(r).toMatchObject({
      preset: '30d',
      from: '2026-08-26',
      to: '2026-09-24',
      days: 30,
      prevFrom: '2026-07-27',
      prevTo: '2026-08-25',
    })
  })

  it('supports presets', () => {
    expect(parseRange({ preset: 'today' }, NOW)).toMatchObject({
      from: '2026-09-24',
      to: '2026-09-24',
      days: 1,
      prevFrom: '2026-09-23',
    })
    expect(parseRange({ preset: '7d' }, NOW)).toMatchObject({ from: '2026-09-18', days: 7 })
    expect(parseRange({ preset: 'mtd' }, NOW)).toMatchObject({ from: '2026-09-01', days: 24 })
    expect(parseRange({ preset: '12m' }, NOW).from).toBe('2025-09-25')
  })

  it('accepts a valid custom range and rejects garbage', () => {
    expect(parseRange({ from: '2026-01-01', to: '2026-01-31' }, NOW)).toMatchObject({
      preset: 'custom',
      days: 31,
      prevTo: '2025-12-31',
      prevFrom: '2025-12-01',
    })
    expect(parseRange({ from: '2026-02-01', to: '2026-01-01' }, NOW).preset).toBe('30d')
    expect(parseRange({ from: "2026-01-01'; drop table", to: '2026-01-31' }, NOW).preset).toBe('30d')
    expect(parseRange({ preset: 'forever' }, NOW).preset).toBe('30d')
  })

  it('builds query strings and chart buckets', () => {
    expect(rangeQuery({ preset: '30d', from: '', to: '' })).toBe('')
    expect(rangeQuery({ preset: '7d', from: '', to: '' })).toBe('?preset=7d')
    expect(rangeQuery({ preset: 'custom', from: '2026-01-01', to: '2026-01-02' })).toBe(
      '?from=2026-01-01&to=2026-01-02',
    )
    expect([bucketFor(30), bucketFor(365), bucketFor(800)]).toEqual(['day', 'week', 'month'])
  })
})
