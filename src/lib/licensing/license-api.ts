import 'server-only'
import { env } from '@/lib/env'
import type { LicenseApiResult, LicenseProvider } from '@/lib/billing/types'
import { isLumiraLsProduct } from '@/server/catalog'

export type { LicenseApiResult }

/** LS License API (form-encoded, 60 requests/minute; PRD §6.4). */
async function call(
  action: 'activate' | 'validate' | 'deactivate',
  form: Record<string, string>,
): Promise<LicenseApiResult> {
  let res: Response
  try {
    res = await fetch(`https://api.lemonsqueezy.com/v1/licenses/${action}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form),
      cache: 'no-store',
    })
  } catch {
    return {
      error: 'The license service is unreachable. Try again shortly.',
      activated: false,
      valid: false,
      deactivated: false,
    }
  }
  if (res.status === 429)
    return { error: 'Too many license requests. Try again in a minute.', activated: false, valid: false }
  const body = (await res.json().catch(() => ({ error: `License service error ${res.status}` }))) as LicenseApiResult

  // The License API accepts keys from ANY Lemon Squeezy store: only Lumira-issued keys count (FR-LIC-05).
  if (body.meta && (body.meta.store_id !== env.LS_STORE_ID || !(await isLumiraLsProduct(body.meta.product_id)))) {
    return { error: 'This license key was not issued by Lumira.', activated: false, valid: false, deactivated: false }
  }
  return { ...body, error: body.error ?? null }
}

export const licenseApi: LicenseProvider = {
  activate: (key, instanceName) => call('activate', { license_key: key, instance_name: instanceName }),
  validate: (key, instanceId) =>
    call('validate', { license_key: key, ...(instanceId ? { instance_id: instanceId } : {}) }),
  deactivate: (key, instanceId) => call('deactivate', { license_key: key, instance_id: instanceId }),
}
