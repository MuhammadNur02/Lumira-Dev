'use client'

import { useState, useTransition } from 'react'
import { useReverification } from '@clerk/nextjs'
import { Gift, Mail, SlidersHorizontal, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MotionDialog } from '@/components/ui/motion-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { grantComp, resendEmail, revokeEntitlement, setActivationLimit } from './actions'

type Result = { ok: true } | { ok: false; error: string } | undefined

function useRun() {
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<Result | { ok: boolean; error?: string }>, success: string, done?: () => void) =>
    start(async () => {
      try {
        const result = await fn()
        if (result && result.ok === false) toast.error(result.error ?? 'Action failed')
        else {
          toast.success(success)
          done?.()
        }
      } catch {
        toast.error('Verification was cancelled.')
      }
    })
  return { pending, run }
}

export function ResendEmailButton({ emailId, template }: { emailId: string; template: string }) {
  const { pending, run } = useRun()
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => run(() => resendEmail(emailId), `Queued a fresh ${template} email`)}
    >
      <Mail aria-hidden /> Resend
    </Button>
  )
}

export function GrantCompDialog({ userId, products }: { userId: string; products: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [tier, setTier] = useState<'personal' | 'team' | 'extended'>('team')
  const [reason, setReason] = useState('')
  const { pending, run } = useRun()
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Gift aria-hidden /> Grant comp
      </Button>
      <MotionDialog
        open={open}
        onOpenChange={(v) => !pending && setOpen(v)}
        title="Grant a complimentary license"
        description="Adds download access in the Library. No license key is issued."
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="comp-product">Product</FieldLabel>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="comp-product" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="comp-tier">Tier</FieldLabel>
            <Select value={tier} onValueChange={(v) => setTier(v as typeof tier)}>
              <SelectTrigger id="comp-tier" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="extended">Extended</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="comp-reason">Reason (audited)</FieldLabel>
            <Textarea id="comp-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={reason.trim().length < 3 || !productId}
              loading={pending}
              onClick={() =>
                run(
                  () => grantComp({ userId, productId, tier, reason }),
                  'Complimentary access granted',
                  () => setOpen(false),
                )
              }
            >
              Grant access
            </Button>
          </div>
        </FieldGroup>
      </MotionDialog>
    </>
  )
}

export function RevokeEntitlementButton({ id, label }: { id: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { pending, run } = useRun()
  const revoke = useReverification(revokeEntitlement)
  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label={`Revoke ${label}`} onClick={() => setOpen(true)}>
        <Ban />
      </Button>
      <MotionDialog
        open={open}
        onOpenChange={(v) => !pending && setOpen(v)}
        title={`Revoke ${label}?`}
        description="Downloads and licensed docs stop immediately. You’ll be asked to verify it’s you."
      >
        <Field>
          <FieldLabel htmlFor={`revoke-${id}`}>Reason (audited)</FieldLabel>
          <Textarea id={`revoke-${id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending} autoFocus>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 3}
            loading={pending}
            onClick={() =>
              run(
                () => revoke(id, reason),
                'Entitlement revoked',
                () => setOpen(false),
              )
            }
          >
            Revoke
          </Button>
        </div>
      </MotionDialog>
    </>
  )
}

export function ActivationLimitDialog({ keyId, current }: { keyId: string; current: number | null }) {
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(current == null ? '' : String(current))
  const [reason, setReason] = useState('')
  const { pending, run } = useRun()
  const update = useReverification(setActivationLimit)
  return (
    <>
      <Button variant="ghost" size="icon-sm" aria-label="Change activation limit" onClick={() => setOpen(true)}>
        <SlidersHorizontal />
      </Button>
      <MotionDialog
        open={open}
        onOpenChange={(v) => !pending && setOpen(v)}
        title="Change activation limit"
        description="Updated in Lemon Squeezy first, then here. Leave empty for unlimited."
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`limit-${keyId}`}>Activation limit</FieldLabel>
            <Input
              id={`limit-${keyId}`}
              type="number"
              min={1}
              max={1000}
              placeholder="Unlimited"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`limit-reason-${keyId}`}>Reason (audited)</FieldLabel>
            <Textarea
              id={`limit-reason-${keyId}`}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={reason.trim().length < 3}
              loading={pending}
              onClick={() =>
                run(
                  () => update(keyId, limit ? Number(limit) : null, reason),
                  'Activation limit updated',
                  () => setOpen(false),
                )
              }
            >
              Save limit
            </Button>
          </div>
        </FieldGroup>
      </MotionDialog>
    </>
  )
}
