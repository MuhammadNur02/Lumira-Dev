'use client'

import { ErrorBoundaryView } from '@/components/lumira/error-boundary-view'

export default function StorefrontError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorBoundaryView {...props} />
}
