'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { Route } from 'next'
import { toast } from 'sonner'

/** `?welcome=1` from the emailed sign-in link (P6.12): one toast, then the flag leaves the URL. */
export function WelcomeToast() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const welcome = params.get('welcome') === '1'

  useEffect(() => {
    if (!welcome) return
    toast.success('You’re signed in. Every future version lands here.')
    router.replace(pathname as Route, { scroll: false })
  }, [welcome, router, pathname])

  return null
}
