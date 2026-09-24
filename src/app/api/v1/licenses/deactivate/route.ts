import { deactivate } from '@/server/licensing/proxy'

/** Lumira CLI proxy to the Lemon Squeezy License API (FR-LIC-05). */
export function POST(req: Request) {
  return deactivate(req)
}
