import Link from 'next/link'
import { Wordmark } from '@/components/lumira/wordmark'

/** Sign-in and sign-up sit on the canvas with the hero glow, centered in a 440 px column (SG §5.8). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 hero-glow px-4 py-16">
      <Link
        prefetch={false}
        href="/"
        className="rounded-md p-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Wordmark />
        <span className="sr-only">Lumira store</span>
      </Link>
      <div className="w-full max-w-[440px]">{children}</div>
    </main>
  )
}
