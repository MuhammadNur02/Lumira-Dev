import type { DeviceKey } from './devices'

/** Player state machine (Task.md P4.03, FR-LP-07): loading → slow → ready | failed; hidden under <Activity>. */
export type PreviewState = {
  status: 'loading' | 'slow' | 'ready' | 'failed' | 'hidden'
  device: DeviceKey
  rotated: boolean
  path: string
  failure?: 'timeout' | 'bridge_error' | 'network'
}

export type PreviewAction =
  | { type: 'load' }
  | { type: 'slow' }
  | { type: 'ready' }
  | { type: 'fail'; reason: NonNullable<PreviewState['failure']> }
  | { type: 'device'; device: DeviceKey }
  | { type: 'rotate' }
  | { type: 'navigate'; path: string }
  | { type: 'hide' }
  | { type: 'show' }

export function reducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case 'load':
      return { ...state, status: 'loading', failure: undefined }
    case 'slow':
      return state.status === 'loading' ? { ...state, status: 'slow' } : state
    case 'ready':
      return state.status === 'hidden' ? state : { ...state, status: 'ready', failure: undefined }
    case 'fail':
      return state.status === 'ready' || state.status === 'hidden'
        ? state
        : { ...state, status: 'failed', failure: action.reason }
    case 'device':
      return {
        ...state,
        device: action.device,
        rotated: action.device === 'desktop' || action.device === 'fit' ? false : state.rotated,
      }
    case 'rotate':
      return state.device === 'tablet' || state.device === 'mobile' ? { ...state, rotated: !state.rotated } : state
    case 'navigate':
      return state.path === action.path ? state : { ...state, path: action.path }
    case 'hide':
      return { ...state, status: 'hidden' }
    case 'show':
      return { ...state, status: 'loading', failure: undefined }
  }
}

/** 3 s → "Warming up the demo", 8 s → failed (FR-LP-07). */
export const SLOW_AFTER_MS = 3000
export const FAIL_AFTER_MS = 8000
