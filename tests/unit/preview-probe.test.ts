import { describe, expect, it } from 'vitest'
import { probeDemo } from '@/components/preview/probe'
import { cspOptionsFromEnv, siteCsp } from '@/lib/csp'

describe('Live Preview reachability probe (FR-LP-07)', () => {
  it('reports reachable on any HTTP answer, including opaque responses', async () => {
    const ok = (() => Promise.resolve(new Response(null, { status: 200 }))) as unknown as typeof fetch
    expect(await probeDemo('https://folio.lumira-demos.dev', 1000, ok)).toBe(true)
  })

  it('reports unreachable when the host does not answer (DNS, refused, TLS, timeout)', async () => {
    const down = (() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch
    expect(await probeDemo('https://folio.lumira-demos.dev', 1000, down)).toBe(false)
  })

  it('probes the demo root without credentials or cache', async () => {
    let seen: { url: string; init?: RequestInit } | null = null
    const spy = ((url: string, init?: RequestInit) => {
      seen = { url, init }
      return Promise.resolve(new Response(null))
    }) as unknown as typeof fetch
    await probeDemo('https://folio.lumira-demos.dev', 1000, spy)
    expect(seen!.url).toBe('https://folio.lumira-demos.dev/')
    expect(seen!.init).toMatchObject({ mode: 'no-cors', cache: 'no-store' })
  })

  it('is allowed by the storefront CSP', () => {
    const policy = siteCsp(cspOptionsFromEnv({ NODE_ENV: 'production' }))
    const connect = policy.split('; ').find((d) => d.startsWith('connect-src '))!
    expect(connect).toContain('https://*.lumira-demos.dev')
  })
})
