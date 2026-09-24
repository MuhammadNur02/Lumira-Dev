import { SignIn } from '@clerk/nextjs'

export const metadata = { title: 'Sign in' }

export default function SignInPage() {
  return (
    <SignIn
      appearance={{ elements: { rootBox: 'w-full', cardBox: 'w-full' } }}
      fallbackRedirectUrl="/account/library"
    />
  )
}
