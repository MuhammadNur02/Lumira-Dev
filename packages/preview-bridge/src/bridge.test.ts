// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { startBridge } from './demo'
import { parseDemoMessage, postToDemo } from './host'

const ORIGIN = 'https://folio.lumira-demos.dev'
const frame = {} as Window
const ready = { source: 'lumira-demo', v: 1, type: 'ready', path: '/', title: 'Folio' }

describe('host: parseDemoMessage (FR-LP-06)', () => {
  it('accepts a valid message from our iframe and origin', () => {
    expect(parseDemoMessage({ origin: ORIGIN, source: frame, data: ready }, { origin: ORIGIN, window: frame })).toEqual(
      ready,
    )
  })

  it('ignores messages from any other origin', () => {
    expect(
      parseDemoMessage(
        { origin: 'https://evil.example', source: frame, data: ready },
        { origin: ORIGIN, window: frame },
      ),
    ).toBeNull()
  })

  it('ignores messages from another window on the right origin', () => {
    expect(parseDemoMessage({ origin: ORIGIN, source: {}, data: ready }, { origin: ORIGIN, window: frame })).toBeNull()
  })

  it('ignores payloads that do not match the protocol', () => {
    const bad = { ...ready, v: 2 }
    expect(parseDemoMessage({ origin: ORIGIN, source: frame, data: bad }, { origin: ORIGIN, window: frame })).toBeNull()
    expect(
      parseDemoMessage({ origin: ORIGIN, source: frame, data: 'ready' }, { origin: ORIGIN, window: frame }),
    ).toBeNull()
  })

  it('posts with an explicit target origin', () => {
    const target = { postMessage: vi.fn() } as unknown as Window
    postToDemo(target, ORIGIN, { type: 'set-theme', theme: 'dark' })
    expect(target.postMessage).toHaveBeenCalledWith(
      { source: 'lumira-host', v: 1, type: 'set-theme', theme: 'dark' },
      ORIGIN,
    )
  })
})

describe('demo: startBridge', () => {
  let stop: () => void = () => {}
  afterEach(() => {
    stop()
    vi.restoreAllMocks()
  })

  function framed() {
    const parent = { postMessage: vi.fn() }
    Object.defineProperty(window, 'parent', { value: parent, configurable: true })
    Object.defineProperty(document, 'referrer', {
      value: 'https://lumira.dev/products/folio/preview',
      configurable: true,
    })
    return parent
  }

  it('announces ready and reports client-side navigations', async () => {
    const parent = framed()
    stop = startBridge({ hosts: ['https://lumira.dev'] })
    expect(parent.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'ready' }), 'https://lumira.dev')

    history.pushState({}, '', '/work/atlas')
    await Promise.resolve()
    expect(parent.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'navigate', path: '/work/atlas' }),
      'https://lumira.dev',
    )
  })

  it('applies host commands only from allowed origins', () => {
    const parent = framed()
    const onSetTheme = vi.fn()
    stop = startBridge({ hosts: ['https://lumira.dev'], onSetTheme })
    const data = { source: 'lumira-host', v: 1, type: 'set-theme', theme: 'dark' }
    window.dispatchEvent(
      new MessageEvent('message', { origin: 'https://evil.example', data, source: parent as unknown as Window }),
    )
    expect(onSetTheme).not.toHaveBeenCalled()
    window.dispatchEvent(
      new MessageEvent('message', { origin: 'https://lumira.dev', data, source: parent as unknown as Window }),
    )
    expect(onSetTheme).toHaveBeenCalledWith('dark')
  })
})
