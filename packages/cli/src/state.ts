import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export type LicenseState = { instanceId: string; name: string; activatedAt: string }

const DIR = '.lumira'
const FILE = join(DIR, 'license.json')

/** The instance is stored, never the key (the key stays in your password manager or CI secret). */
export async function readState(cwd = process.cwd()): Promise<LicenseState | null> {
  try {
    return JSON.parse(await readFile(join(cwd, FILE), 'utf8')) as LicenseState
  } catch {
    return null
  }
}

export async function writeState(state: LicenseState, cwd = process.cwd()) {
  await mkdir(join(cwd, DIR), { recursive: true })
  await writeFile(join(cwd, FILE), `${JSON.stringify(state, null, 2)}\n`)
  await ensureGitignored(cwd)
}

export async function clearState(cwd = process.cwd()) {
  await rm(join(cwd, FILE), { force: true })
}

/** Adds `.lumira/` to .gitignore when missing (P5.13). */
export async function ensureGitignored(cwd = process.cwd()) {
  const path = join(cwd, '.gitignore')
  const current = await readFile(path, 'utf8').catch(() => '')
  if (current.split(/\r?\n/).some((line) => line.trim() === '.lumira/' || line.trim() === '.lumira')) return false
  await writeFile(
    path,
    `${current}${current && !current.endsWith('\n') ? '\n' : ''}\n# Lumira license activation (never commit)\n.lumira/\n`,
  )
  return true
}
