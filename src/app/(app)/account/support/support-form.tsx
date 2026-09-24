'use client'

import { useActionState } from 'react'
import { CircleCheck } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { sendSupportRequest, type SupportState } from './actions'

type Option = { value: string; label: string }

export function SupportForm({ orders, keys }: { orders: Option[]; keys: Option[] }) {
  const [state, action, pending] = useActionState<SupportState, FormData>(sendSupportRequest, { status: 'idle' })

  if (state.status === 'sent') {
    return (
      <Alert variant="success" aria-live="polite">
        <CircleCheck aria-hidden />
        <AlertTitle>Message sent</AlertTitle>
        <AlertDescription>We reply within one business day, to the email on your account.</AlertDescription>
      </Alert>
    )
  }

  return (
    <form action={action} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(state.fieldErrors?.subject) || undefined}>
          <FieldLabel htmlFor="support-subject">Subject</FieldLabel>
          <Input
            id="support-subject"
            name="subject"
            required
            maxLength={120}
            aria-invalid={Boolean(state.fieldErrors?.subject) || undefined}
          />
          <FieldError>{state.fieldErrors?.subject}</FieldError>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {orders.length ? (
            <Field>
              <FieldLabel htmlFor="support-order">Related order</FieldLabel>
              <Select name="orderId">
                <SelectTrigger id="support-order" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          {keys.length ? (
            <Field>
              <FieldLabel htmlFor="support-key">Related license</FieldLabel>
              <Select name="licenseKeyId">
                <SelectTrigger id="support-key" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {keys.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </div>
        <Field data-invalid={Boolean(state.fieldErrors?.message) || undefined}>
          <FieldLabel htmlFor="support-message">Message</FieldLabel>
          <Textarea
            id="support-message"
            name="message"
            rows={6}
            required
            maxLength={5000}
            placeholder="What were you trying to do, and what happened instead?"
            aria-invalid={Boolean(state.fieldErrors?.message) || undefined}
          />
          <FieldError>{state.fieldErrors?.message}</FieldError>
        </Field>
        {state.status === 'error' && state.message ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" className="self-start" loading={pending} loadingLabel="Sending">
          Send message
        </Button>
      </FieldGroup>
    </form>
  )
}
