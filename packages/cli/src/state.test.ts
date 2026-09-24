import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { clearState, ensureGitignored, readState, writeState } from './state'

describe('CLI state (P5.13)', () => {
  it('stores the instance, never the key, and gitignores .lumira/', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'lumira-cli-'))
    await writeFile(join(dir, '.gitignore'), 'node_modules\n')
    await writeState({ instanceId: 'inst_1', name: 'my-app', activatedAt: '2026-09-24T00:00:00Z' }, dir)

    const saved = await readFile(join(dir, '.lumira/license.json'), 'utf8')
    expect(JSON.parse(saved)).toEqual({ instanceId: 'inst_1', name: 'my-app', activatedAt: '2026-09-24T00:00:00Z' })
    expect(saved).not.toMatch(/key/i)
    expect(await readFile(join(dir, '.gitignore'), 'utf8')).toContain('.lumira/')

    expect(await ensureGitignored(dir)).toBe(false) // idempotent
    await clearState(dir)
    expect(await readState(dir)).toBeNull()
  })
})
