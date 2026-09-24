export const API = process.env.LUMIRA_API_URL ?? 'https://lumira.dev/api/v1/licenses'

export type ApiResponse = {
  activated?: boolean
  valid?: boolean
  deactivated?: boolean
  instance_id?: string | null
  status?: string | null
  activation_usage?: number | null
  activation_limit?: number | null
  expires_at?: string | null
  error?: string | null
  manage_url?: string
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * POST to the Lumira license proxy with retries on network errors, 429 and 5xx (PRD §6.7):
 * 1 s, 2 s, 4 s, honoring Retry-After.
 */
export async function call(
  action: 'activate' | 'validate' | 'deactivate',
  body: Record<string, string>,
): Promise<{ status: number; body: ApiResponse }> {
  let lastError: unknown
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`${API}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'lumira-cli' },
        body: JSON.stringify(body),
      })
      if ((res.status === 429 || res.status >= 500) && attempt < 3) {
        const retryAfter = Number(res.headers.get('retry-after') ?? 0) * 1000
        await sleep(Math.max(retryAfter, 1000 * 2 ** attempt))
        continue
      }
      return {
        status: res.status,
        body: (await res.json().catch(() => ({ error: `Unexpected response (${res.status})` }))) as ApiResponse,
      }
    } catch (error) {
      lastError = error
      await sleep(1000 * 2 ** attempt)
    }
  }
  throw new Error(`Could not reach Lumira (${String(lastError)}). Check your connection and try again.`)
}
