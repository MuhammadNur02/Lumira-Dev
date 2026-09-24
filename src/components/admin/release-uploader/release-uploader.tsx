'use client'

import { useEffect, useRef, useState } from 'react'
import { FileArchive, UploadCloud, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PublishForm } from './publish-form'
import { uploadRelease, type UploadProgress } from './upload'

type Phase =
  | { kind: 'idle' }
  | { kind: 'uploading'; progress: UploadProgress }
  | { kind: 'uploaded'; releaseId: string; version: string }
  | { kind: 'error'; message: string }

const MAX = 5 * 1024 ** 3

/** FR-AD-52 uploader: drop zone (zip only), progress with EMA throughput and ETA, cancel, unload guard. */
export function ReleaseUploader({
  productId,
  productName,
  suggestedVersion,
}: {
  productId: string
  productName: string
  suggestedVersion: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [version, setVersion] = useState(suggestedVersion)
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [drag, setDrag] = useState(false)
  const [rate, setRate] = useState(0)
  const controller = useRef<AbortController | null>(null)
  const last = useRef({ at: 0, bytes: 0, ema: 0 })

  const uploading = phase.kind === 'uploading'
  useEffect(() => {
    if (!uploading) return
    const guard = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [uploading])

  function pick(f: File | undefined) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.zip')) return toast.error('Releases must be .zip files.')
    if (f.size > MAX) return toast.error('Releases are limited to 5 GB.')
    setFile(f)
    setPhase({ kind: 'idle' })
  }

  async function start() {
    if (!file) return
    controller.current = new AbortController()
    last.current = { at: performance.now(), bytes: 0, ema: 0 }
    setPhase({ kind: 'uploading', progress: { uploaded: 0, hashed: 0 } })
    try {
      const release = await uploadRelease(
        file,
        productId,
        version.trim(),
        (progress) => {
          const now = performance.now()
          const dt = (now - last.current.at) / 1000
          if (progress.uploaded > last.current.bytes && dt > 0.25) {
            const instant = (progress.uploaded - last.current.bytes) / dt
            last.current = {
              at: now,
              bytes: progress.uploaded,
              ema: last.current.ema ? 0.3 * instant + 0.7 * last.current.ema : instant,
            }
            setRate(last.current.ema)
          }
          setPhase({ kind: 'uploading', progress })
        },
        controller.current.signal,
      )
      setPhase({ kind: 'uploaded', releaseId: release.id, version: release.semver })
      toast.success(`v${release.semver} uploaded. Checksum verified and stored.`)
    } catch (error) {
      const cancelled = controller.current?.signal.aborted
      setPhase(
        cancelled
          ? { kind: 'idle' }
          : { kind: 'error', message: error instanceof Error ? error.message : 'Upload failed' },
      )
      if (cancelled) toast('Upload cancelled. Parts were discarded.')
    }
  }

  if (phase.kind === 'uploaded')
    return <PublishForm releaseId={phase.releaseId} version={phase.version} productName={productName} />

  const p = phase.kind === 'uploading' ? phase.progress : null
  const pct = file && p ? (p.uploaded / file.size) * 100 : 0
  const eta = file && p && rate > 0 ? Math.max(0, (file.size - p.uploaded) / rate) : null

  return (
    <div className="flex flex-col gap-5">
      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDrag(true)
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrag(false)
          pick(e.dataTransfer.files[0])
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center transition-colors',
          'focus-within:ring-2 focus-within:ring-ring hover:bg-accent/50',
          drag && 'border-brand bg-brand-subtle/40',
          uploading && 'pointer-events-none opacity-60',
        )}
      >
        <UploadCloud aria-hidden strokeWidth={1.5} className="size-8 text-muted-foreground" />
        <span className="text-body-sm">
          <span className="font-medium">Drop a .zip</span> or click to choose · up to 5 GB
        </span>
        <input
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </label>

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-body-sm">
          <FileArchive aria-hidden className="size-4 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="text-muted-foreground tabular-nums">{formatBytes(file.size)}</span>
          {!uploading ? (
            <Button variant="ghost" size="icon-xs" aria-label="Remove file" onClick={() => setFile(null)}>
              <X />
            </Button>
          ) : null}
        </div>
      ) : null}

      <Field className="max-w-xs">
        <FieldLabel htmlFor="release-version">Version</FieldLabel>
        <Input
          id="release-version"
          className="font-mono"
          value={version}
          disabled={uploading}
          onChange={(e) => setVersion(e.target.value)}
        />
        <FieldDescription>Plain semver, greater than every existing release.</FieldDescription>
      </Field>

      {p && file ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <Progress value={pct} aria-label="Upload progress" />
          <div className="flex flex-wrap justify-between gap-2 text-caption text-muted-foreground tabular-nums">
            <span>
              {formatBytes(p.uploaded)} of {formatBytes(file.size)} · {pct.toFixed(1)}%
            </span>
            <span>
              {rate ? `${formatBytes(rate)}/s` : 'Starting…'}
              {eta != null ? ` · ${eta > 90 ? `${Math.ceil(eta / 60)} min` : `${Math.ceil(eta)} s`} left` : ''} ·
              checksum {((p.hashed / file.size) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      ) : null}

      {phase.kind === 'error' ? (
        <p role="alert" className="text-body-sm text-destructive">
          {phase.message}
        </p>
      ) : null}

      <div className="flex gap-2">
        {uploading ? (
          <Button variant="secondary" onClick={() => controller.current?.abort()}>
            Cancel upload
          </Button>
        ) : (
          <Button onClick={start} disabled={!file || !version.trim()}>
            <UploadCloud aria-hidden /> Upload to R2
          </Button>
        )}
      </div>
    </div>
  )
}
