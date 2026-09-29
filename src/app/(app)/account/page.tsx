import { redirect } from 'next/navigation'

// Renders nothing: it only forwards to the Library, so there is no UI to validate for instant navigation.
export const instant = false

export default function AccountIndex() {
  redirect('/account/library')
}
