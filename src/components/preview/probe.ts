/**
 * Demo reachability probe (FR-LP-07). An iframe fires `load` even when the demo host is down: the
 * browser loads its own error page, which is invisible to us cross-origin. So "ready on load" alone
 * leaves buyers staring at a blank frame. A `no-cors` request settles on any HTTP response and
 * rejects on DNS, connection or TLS failure, which is what a dead or undeployed demo looks like.
 * (HTTP 5xx pages still count as reachable: opaque responses carry no status.)
 */
export function probeDemo(origin: string, timeoutMs: number, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  return fetchImpl(`${origin}/`, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs) }).then(
    () => true,
    () => false,
  )
}
