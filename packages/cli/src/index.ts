#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { cancel, intro, isCancel, log, outro, password, spinner, text } from '@clack/prompts'
import { call } from './api.js'
import { clearState, readState, writeState } from './state.js'

const VERSION = '1.0.0'

async function askKey(): Promise<string> {
  const fromEnv = process.env.LUMIRA_LICENSE_KEY?.trim()
  if (fromEnv) return fromEnv
  if (!process.stdin.isTTY) fail('Set LUMIRA_LICENSE_KEY when running non-interactively.')
  const key = await password({
    message: 'Paste your Lumira license key',
    validate: (v) => (v && v.trim().length >= 16 ? undefined : 'That does not look like a license key'),
  })
  if (isCancel(key)) exit()
  return String(key).trim()
}

function exit(): never {
  cancel('Cancelled')
  process.exit(1)
}

function fail(message: string, manageUrl?: string): never {
  log.error(message)
  if (manageUrl) log.info(`Manage activations: ${manageUrl}`)
  process.exit(1)
}

async function activate() {
  intro('Lumira · activate')
  const existing = await readState()
  if (existing)
    log.warn(`This project is already activated as "${existing.name}". Run \`lumira deactivate\` first to move it.`)
  const key = await askKey()
  const pkg = JSON.parse(await readFile('package.json', 'utf8').catch(() => '{}')) as { name?: string }
  const suggested = pkg.name ?? basename(process.cwd())
  const name =
    process.env.LUMIRA_INSTANCE_NAME ??
    (process.stdin.isTTY
      ? await text({
          message: 'Name this activation',
          initialValue: suggested,
          validate: (v) => (v?.trim() ? undefined : 'Required'),
        })
      : suggested)
  if (isCancel(name)) exit()

  const s = spinner()
  s.start('Activating')
  const { status, body } = await call('activate', { license_key: key, instance_name: String(name) })
  if (status !== 200 || !body.activated || !body.instance_id) {
    s.stop('Activation failed')
    fail(body.error ?? 'Activation failed', status === 409 ? body.manage_url : undefined)
  }
  await writeState({ instanceId: body.instance_id, name: String(name), activatedAt: new Date().toISOString() })
  s.stop('Activated')
  outro(`✔ Activated "${String(name)}" · ${body.activation_usage}/${body.activation_limit ?? '∞'} activations used`)
}

async function status() {
  intro('Lumira · status')
  const state = await readState()
  if (!state) fail('This project is not activated. Run `npx lumira@latest activate`.')
  const key = await askKey()
  const { status: code, body } = await call('validate', { license_key: key, instance_id: state.instanceId })
  if (code !== 200 || !body.valid) fail(body.error ?? 'This activation is no longer valid.', body.manage_url)
  outro(`✔ "${state.name}" is active · ${body.activation_usage}/${body.activation_limit ?? '∞'} activations used`)
}

async function deactivate() {
  intro('Lumira · deactivate')
  const state = await readState()
  if (!state) fail('This project is not activated.')
  const key = await askKey()
  const { status: code, body } = await call('deactivate', { license_key: key, instance_id: state.instanceId })
  if (code !== 200 || !body.deactivated) fail(body.error ?? 'Deactivation failed', body.manage_url)
  await clearState()
  outro(`✔ Freed the activation "${state.name}"`)
}

const HELP = `lumira ${VERSION}

Usage: npx lumira@latest <command>

Commands:
  activate     Activate this project with your license key
  status       Check this project's activation
  deactivate   Free this project's activation

Environment:
  LUMIRA_LICENSE_KEY     Use this key instead of prompting (CI)
  LUMIRA_INSTANCE_NAME   Activation name for non-interactive runs
`

const command = process.argv[2]
const commands: Record<string, () => Promise<void>> = { activate, status, deactivate }

if (!command || command === '--help' || command === '-h') console.log(HELP)
else if (command === '--version' || command === '-v') console.log(VERSION)
else if (commands[command]) {
  commands[command]!().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)))
} else {
  console.error(`Unknown command "${command}".\n\n${HELP}`)
  process.exit(1)
}
