/**
 * In-memory stand-in for `@upstash/redis` covering what `@upstash/ratelimit`'s single-region
 * sliding window and the license-validation cache use. `evalsha` emulates the sliding-window Lua
 * script (current + weighted previous bucket) exactly as shipped in @upstash/ratelimit 2.x.
 */
export class FakeRedis {
  store = new Map<string, unknown>()

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T | undefined) ?? null
  }
  async set(key: string, value: unknown): Promise<'OK'> {
    this.store.set(key, value)
    return 'OK'
  }
  async del(...keys: string[]): Promise<number> {
    let n = 0
    for (const k of keys) if (this.store.delete(k)) n++
    return n
  }

  async evalsha(_hash: string, keys: string[], args: unknown[]): Promise<[number, number]> {
    const [currentKey, previousKey] = keys as [string, string]
    const tokens = Number(args[0])
    const now = Number(args[1])
    const window = Number(args[2])
    const incrementBy = Number(args[3] ?? 1)
    const current = Number(this.store.get(currentKey) ?? 0)
    const previous = Math.floor((1 - (now % window) / window) * Number(this.store.get(previousKey) ?? 0))
    if (incrementBy > 0 && previous + current >= tokens) return [-1, tokens]
    const next = current + incrementBy
    this.store.set(currentKey, next)
    return [tokens - (next + previous), tokens]
  }

  async eval(_script: string, keys: string[], args: unknown[]) {
    return this.evalsha('', keys, args)
  }
}
