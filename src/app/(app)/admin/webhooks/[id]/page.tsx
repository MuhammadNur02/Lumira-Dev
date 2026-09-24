import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { AdminPageHeader, Panel } from '@/components/admin/admin-ui'
import { CodeBlock } from '@/components/lumira/code-block'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db/client'
import { webhookEvents } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { formatDateTime } from '@/lib/format'
import { ReplayButton } from '../replay-button'

export const metadata = { title: 'Webhook event' }

/** Defense in depth: stored payloads are already redacted, but never render anything key-shaped. */
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        /^(key|license_key|token|secret|password|access_token|signature)$/i.test(k) && typeof v === 'string'
          ? '[redacted]'
          : redact(v),
      ]),
    )
  }
  return value
}

export default async function WebhookEventPage({ params }: PageProps<'/admin/webhooks/[id]'>) {
  await requireAdmin()
  const id = z.uuid().safeParse((await params).id)
  if (!id.success) notFound()
  const event = await db.query.webhookEvents.findFirst({ where: eq(webhookEvents.id, id.data) })
  if (!event) notFound()
  return (
    <>
      <AdminPageHeader
        title={`${event.source} · ${event.eventName}`}
        description={`Received ${formatDateTime(event.receivedAt)}${event.processedAt ? ` · processed ${formatDateTime(event.processedAt)}` : ''} · ${event.attempts} attempt${event.attempts === 1 ? '' : 's'}${event.durationMs != null ? ` · ${event.durationMs} ms` : ''}`}
        actions={
          <>
            <Badge
              variant={event.status === 'processed' ? 'success' : event.status === 'failed' ? 'danger' : 'neutral'}
            >
              {event.status}
            </Badge>
            <ReplayButton id={event.id} size="default" />
          </>
        }
      />
      {event.error ? (
        <Panel title="Error">
          <pre className="overflow-x-auto font-mono text-caption whitespace-pre-wrap text-destructive">
            {event.error}
          </pre>
        </Panel>
      ) : null}
      <Panel title="Payload" description="As stored in the ledger (secrets redacted before storage)">
        <CodeBlock
          code={JSON.stringify(redact(event.payload), null, 2)}
          lang="json"
          title={`${event.idempotencyKey.slice(0, 12)}….json`}
          copy={false}
          className="ph-no-capture"
        />
      </Panel>
    </>
  )
}
