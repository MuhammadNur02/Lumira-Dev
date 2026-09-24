'use client'

import { useState, useTransition } from 'react'
import { useReverification } from '@clerk/nextjs'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { MotionDialog } from '@/components/ui/motion-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createDiscount, editDiscount, type DiscountInputT } from './actions'

export type VariantOption = { id: number; label: string }
export type DiscountDraft = DiscountInputT & { id?: string }

const toLocal = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 16) : '')

/** Create (FR-AD-31) and clone-edit (FR-AD-32) in one dialog. Edits warn that redemptions restart. */
export function DiscountDialog({ variants, initial }: { variants: VariantOption[]; initial?: DiscountDraft }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    amountType: initial?.amountType ?? ('percent' as 'percent' | 'fixed'),
    amount: initial ? String(initial.amountType === 'fixed' ? initial.amount / 100 : initial.amount) : '',
    variantIds: (initial?.variantIds ?? []) as number[],
    maxRedemptions: initial?.maxRedemptions ? String(initial.maxRedemptions) : '',
    startsAt: toLocal(initial?.startsAt as Date | undefined),
    expiresAt: toLocal(initial?.expiresAt as Date | undefined),
    duration: initial?.duration ?? ('once' as 'once' | 'repeating' | 'forever'),
    durationInMonths: initial?.durationInMonths ? String(initial.durationInMonths) : '',
  })
  const edit = useReverification(editDiscount)
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const input: DiscountInputT = {
      name: form.name,
      code: form.code,
      amountType: form.amountType,
      amount: form.amountType === 'fixed' ? Math.round(Number(form.amount) * 100) : Math.round(Number(form.amount)),
      variantIds: form.variantIds,
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : undefined,
      startsAt: form.startsAt ? new Date(form.startsAt) : undefined,
      expiresAt: form.expiresAt ? new Date(form.expiresAt) : undefined,
      duration: form.duration,
      durationInMonths:
        form.duration === 'repeating' && form.durationInMonths ? Number(form.durationInMonths) : undefined,
    }
    start(async () => {
      try {
        const result = initial?.id ? await edit(initial.id, input) : await createDiscount(input)
        if (result.ok) {
          toast.success(initial?.id ? `Re-created ${input.code.toUpperCase()}` : `Created ${input.code.toUpperCase()}`)
          setOpen(false)
        } else toast.error(result.error)
      } catch {
        toast.error('Verification was cancelled.')
      }
    })
  }

  return (
    <>
      {initial?.id ? (
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${initial.code}`} onClick={() => setOpen(true)}>
          <Pencil />
        </Button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus aria-hidden /> New discount
        </Button>
      )}
      <MotionDialog
        open={open}
        onOpenChange={(next) => !pending && setOpen(next)}
        size="form"
        title={initial?.id ? `Edit ${initial.code}` : 'New discount'}
        description={
          initial?.id
            ? 'Lemon Squeezy has no update endpoint: the code is deleted and re-created with the same name. Redemption counts restart.'
            : 'Created in Lemon Squeezy and mirrored here. Codes are uppercase letters and digits.'
        }
      >
        <form onSubmit={submit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="d-name">Name</FieldLabel>
                <Input
                  id="d-name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="d-code">Code</FieldLabel>
                <Input
                  id="d-code"
                  required
                  pattern="[A-Za-z0-9]{3,256}"
                  className="font-mono uppercase"
                  disabled={Boolean(initial?.id)}
                  value={form.code}
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="d-type">Type</FieldLabel>
                <Select value={form.amountType} onValueChange={(v) => set('amountType', v as 'percent' | 'fixed')}>
                  <SelectTrigger id="d-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off</SelectItem>
                    <SelectItem value="fixed">Fixed amount (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="d-amount">
                  {form.amountType === 'percent' ? 'Percent' : 'Amount in USD'}
                </FieldLabel>
                <Input
                  id="d-amount"
                  type="number"
                  required
                  min={1}
                  max={form.amountType === 'percent' ? 100 : undefined}
                  step={form.amountType === 'percent' ? 1 : 0.01}
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Limit to variants</FieldLabel>
              <FieldDescription>Leave empty to apply to every product.</FieldDescription>
              <div className="grid max-h-40 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
                {variants.map((v) => (
                  <label
                    key={v.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-body-sm hover:bg-accent"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-(--brand)"
                      checked={form.variantIds.includes(v.id)}
                      onChange={(e) =>
                        set(
                          'variantIds',
                          e.target.checked ? [...form.variantIds, v.id] : form.variantIds.filter((id) => id !== v.id),
                        )
                      }
                    />
                    <span className="truncate">{v.label}</span>
                  </label>
                ))}
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="d-max">Max redemptions</FieldLabel>
                <Input
                  id="d-max"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.maxRedemptions}
                  onChange={(e) => set('maxRedemptions', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="d-start">Starts</FieldLabel>
                <Input
                  id="d-start"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => set('startsAt', e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="d-end">Expires</FieldLabel>
                <Input
                  id="d-end"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => set('expiresAt', e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="d-duration">Subscription duration</FieldLabel>
                <Select
                  value={form.duration}
                  onValueChange={(v) => set('duration', v as 'once' | 'repeating' | 'forever')}
                >
                  <SelectTrigger id="d-duration" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">First payment only</SelectItem>
                    <SelectItem value="repeating">Several months</SelectItem>
                    <SelectItem value="forever">Every payment</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.duration === 'repeating' ? (
                <Field>
                  <FieldLabel htmlFor="d-months">Months</FieldLabel>
                  <Input
                    id="d-months"
                    type="number"
                    min={1}
                    required
                    value={form.durationInMonths}
                    onChange={(e) => set('durationInMonths', e.target.value)}
                  />
                </Field>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" loading={pending} loadingLabel="Saving discount">
                {initial?.id ? 'Re-create code' : 'Create discount'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </MotionDialog>
    </>
  )
}
