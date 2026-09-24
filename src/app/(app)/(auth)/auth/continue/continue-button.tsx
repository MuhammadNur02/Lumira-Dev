'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Route } from 'next'
import { useSignIn } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

/**
 * Redeems the single-use Clerk sign-in ticket only on an explicit click, so link-scanning mail
 * gateways cannot consume it (P6.12, NFR-SEC-15). An expired or used ticket falls back to the
 * normal email-code sign-in.
 */
export function ContinueButton() {
  const { signIn } = useSignIn()
  const ticket = useSearchParams().get('ticket')
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'working' | 'error'>(ticket ? 'idle' : 'error')

  async function redeem() {
    if (!ticket) return
    setState('working')
    try {
      const { error } = await signIn.ticket({ ticket })
      if (error || signIn.status !== 'complete') throw error ?? new Error(signIn.status ?? 'incomplete')
      const finalized = await signIn.finalize()
      if (finalized.error) throw finalized.error
      router.replace('/account/library?welcome=1' as Route)
    } catch {
      setState('error')
    }
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-body-sm text-muted-foreground">
          This link has expired or was already used. Sign in with your email instead.
        </p>
        <Button asChild size="lg">
          <Link href={'/sign-in?redirect_url=/account/library' as Route}>Sign in with your email</Link>
        </Button>
      </div>
    )
  }
  return (
    <Button size="lg" className="w-full" onClick={redeem} loading={state === 'working'} loadingLabel="Signing you in">
      Continue to your Library
    </Button>
  )
}
