'use client'

import { useId } from 'react'
import { RadioGroup } from 'radix-ui'
import * as m from 'motion/react-m'
import { spring } from '@/lib/motion/springs'
import { cn } from '@/lib/utils'

export type SegmentedOption<T extends string> = { value: T; label: string; icon?: React.ReactNode; shortLabel?: string }

/**
 * Segmented control (SG §5.3, §6.4.2): radiogroup semantics with roving focus and arrow keys
 * (Radix RadioGroup); the active pill glides with a `layoutId` indicator on the `snappy` spring.
 * State is conveyed by the indicator and `aria-checked`, never by color alone.
 */
export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
  hideLabelsBelow = 'xl',
}: {
  value: T
  onValueChange: (value: T) => void
  options: SegmentedOption<T>[]
  label: string
  className?: string
  hideLabelsBelow?: 'xl' | 'lg' | 'never'
}) {
  const id = useId()
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      aria-label={label}
      orientation="horizontal"
      loop
      className={cn('inline-flex items-center rounded-md bg-muted p-1', className)}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <RadioGroup.Item
            key={o.value}
            value={o.value}
            aria-label={o.label}
            className={cn(
              'relative inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-sm px-2.5 text-caption transition-colors outline-none',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active ? (
              <m.span
                layoutId={`segmented-${id}`}
                className="absolute inset-0 rounded-sm bg-card shadow-sm"
                transition={spring.snappy}
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-1.5 [&_svg]:size-4">
              {o.icon}
              <span
                className={cn(
                  hideLabelsBelow === 'xl' && 'hidden xl:inline',
                  hideLabelsBelow === 'lg' && 'hidden lg:inline',
                )}
              >
                {o.shortLabel ?? o.label}
              </span>
            </span>
          </RadioGroup.Item>
        )
      })}
    </RadioGroup.Root>
  )
}
