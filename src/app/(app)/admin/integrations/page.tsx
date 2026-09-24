import { Suspense } from 'react'
import { connection } from 'next/server'
import { CircleAlert, CircleCheck, CircleX } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/admin-ui'
import { Badge } from '@/components/ui/badge'
import { requireAdmin } from '@/lib/auth'
import { integrationChecks } from '@/server/admin/health'

export const metadata = { title: 'Integrations' }

const STATUS = {
  green: { label: 'Healthy', variant: 'success', icon: CircleCheck },
  amber: { label: 'Attention', variant: 'warning', icon: CircleAlert },
  red: { label: 'Failing', variant: 'danger', icon: CircleX },
} as const

export default async function IntegrationsPage() {
  await requireAdmin()
  return (
    <>
      <AdminPageHeader
        title="Integrations"
        description="Live probes of every external service (FR-AD-60). Each check has a 5 s budget; nothing here is cached."
      />
      <Suspense
        fallback={
          <div className="grid gap-(--bento-gap) md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-32 skeleton-shimmer rounded-3xl" />
            ))}
          </div>
        }
      >
        <Checks />
      </Suspense>
    </>
  )
}

async function Checks() {
  await connection()
  const checks = await integrationChecks()
  return (
    <ul className="grid gap-(--bento-gap) md:grid-cols-2 xl:grid-cols-3">
      {checks.map((c) => {
        const s = STATUS[c.status]
        const Icon = s.icon
        return (
          <li key={c.name} className="bento-light bento-surface flex flex-col gap-2 p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-heading-4">{c.name}</h2>
              <Badge variant={s.variant}>
                <Icon aria-hidden /> {s.label}
              </Badge>
            </div>
            <p className="text-body-sm text-muted-foreground">{c.detail}</p>
            {c.fix ? <p className="text-caption">{c.fix}</p> : null}
          </li>
        )
      })}
    </ul>
  )
}
