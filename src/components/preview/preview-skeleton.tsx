import { Skeleton } from '@/components/ui/skeleton'

/** Static shell of the player (toolbar + stage) painted before the client player hydrates. */
export function PreviewSkeleton({ name }: { name: string }) {
  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border glass-bar px-3">
        <span className="size-9" />
        <p className="truncate text-body-sm font-semibold">{name}</p>
        <div className="mx-auto hidden md:block">
          <Skeleton className="h-10 w-72 rounded-md" />
        </div>
        <Skeleton className="ml-auto h-10 w-40 rounded-md" />
      </div>
      <div className="flex flex-1 items-center justify-center stage-dots p-8">
        <p className="font-mono text-micro text-muted-foreground">Loading live demo…</p>
      </div>
    </div>
  )
}
