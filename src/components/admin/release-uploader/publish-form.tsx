'use client'

import { useState, useTransition } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { Plus, Rocket, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { publishRelease } from '@/app/(app)/admin/products/actions'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

const KINDS = ['added', 'improved', 'fixed', 'removed', 'deprecated', 'security', 'breaking'] as const
type Change = { kind: (typeof KINDS)[number]; text: string }

/** FR-AD-53 release form: title, summary, change list, notify toggle. Rich notes are edited in the Studio. */
export function PublishForm({
  releaseId,
  version,
  productName,
  backHref,
}: {
  releaseId: string
  version: string
  productName: string
  backHref?: string
}) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [changes, setChanges] = useState<Change[]>([{ kind: 'added', text: '' }])
  const [notify, setNotify] = useState(true)
  const [pending, start] = useTransition()
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    start(async () => {
      const result = await publishRelease({
        releaseId,
        title,
        summary,
        changes: changes.filter((c) => c.text.trim()),
        notify,
      })
      if (!result.ok) return void toast.error(result.error)
      toast.success(`${productName} v${version} is live${notify ? '. Owners are being emailed.' : '.'}`)
      router.push((backHref ?? '/admin/products') as Route)
    })
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <p className="text-body-sm text-muted-foreground">
          Publish <span className="font-mono text-foreground">v{version}</span> of {productName}. The changelog and
          product page update immediately.
        </p>
        <Field>
          <FieldLabel htmlFor="rel-title">Title</FieldLabel>
          <Input
            id="rel-title"
            required
            minLength={3}
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="rel-summary">Summary</FieldLabel>
          <Textarea
            id="rel-summary"
            required
            minLength={10}
            maxLength={280}
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <FieldDescription>
            {280 - summary.length} characters left. Shown in the changelog and the release email.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Changes</FieldLabel>
          <ul className="flex flex-col gap-2">
            {changes.map((change, i) => (
              <li key={i} className="grid grid-cols-[9rem_1fr_auto] gap-2">
                <Select
                  value={change.kind}
                  onValueChange={(v) =>
                    setChanges((list) => list.map((c, j) => (j === i ? { ...c, kind: v as Change['kind'] } : c)))
                  }
                >
                  <SelectTrigger aria-label={`Change ${i + 1} kind`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k} className="capitalize">
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  aria-label={`Change ${i + 1}`}
                  value={change.text}
                  maxLength={200}
                  onChange={(e) =>
                    setChanges((list) => list.map((c, j) => (j === i ? { ...c, text: e.target.value } : c)))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove change ${i + 1}`}
                  onClick={() => setChanges((list) => list.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setChanges((list) => [...list, { kind: 'fixed', text: '' }])}
          >
            <Plus aria-hidden /> Add change
          </Button>
        </Field>
        <label className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2.5 text-body-sm">
          <span>
            Email eligible owners
            <span className="block text-caption text-muted-foreground">
              Once per owner, even if the queue retries. Respects per-product opt-outs.
            </span>
          </span>
          <Switch checked={notify} onCheckedChange={setNotify} aria-label="Email eligible owners" />
        </label>
        <Button type="submit" className="self-start" loading={pending} loadingLabel="Publishing">
          <Rocket aria-hidden /> Publish v{version}
        </Button>
      </FieldGroup>
    </form>
  )
}
