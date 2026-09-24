'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { track } from '@/lib/analytics/track'
import { formatBytes } from '@/lib/format'

type Channel = 'dashboard' | 'success_page'

/**
 * "Download v2.3.1 · 48.2 MB" (SG §9). Asks `/api/downloads` for a 300 s pre-signed R2 URL on click
 * (FR-DL-02), so nothing downloadable is ever embedded in the page.
 */
export function DownloadButton({
  releaseId,
  version,
  sizeBytes,
  productSlug,
  channel = 'dashboard',
  variant = 'default',
  size = 'default',
  className,
}: {
  releaseId: string
  version: string
  sizeBytes: number
  productSlug: string
  channel?: Channel
  variant?: 'default' | 'brand' | 'secondary' | 'outline'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}) {
  const [busy, setBusy] = useState(false)

  async function download() {
    setBusy(true)
    track('download_clicked', { product_slug: productSlug, version, channel })
    try {
      const res = await fetch('/api/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      })
      const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string; code?: string }
      if (res.ok && body.url) {
        window.location.assign(body.url)
        return
      }
      toast.error(errorCopy(res.status, body), { id: `dl-${releaseId}` })
    } catch {
      toast.error('We couldn’t reach the download service. Check your connection and try again.', {
        id: `dl-${releaseId}`,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={download}
      loading={busy}
      loadingLabel="Preparing your download"
    >
      <Download aria-hidden />
      Download v{version}
      <span className="font-normal opacity-70">· {formatBytes(sizeBytes)}</span>
    </Button>
  )
}

function errorCopy(status: number, body: { error?: string; code?: string }): string {
  switch (status) {
    case 401:
      return 'Your download session expired. Sign in to your Library to download.'
    case 403:
      return body.error === 'major_version'
        ? 'This version is a new major release. Upgrade your license to download it.'
        : 'This download isn’t included in your license.'
    case 404:
      return 'This release is no longer available.'
    case 429:
      return body.error ?? 'Too many downloads. Try again shortly.'
    default:
      return `We couldn’t prepare your download. Try again. If it keeps failing, contact support and mention code ${body.code ?? `DL-${status}`}.`
  }
}
