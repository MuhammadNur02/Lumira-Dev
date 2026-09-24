'use client'

import * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// Lumira patch (SG §5.3 Accordion, §6.4.9): hairline dividers, heading-4 triggers, a plus icon that
// rotates 45°, and height animated with the generated spring easing (bento.css).
function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" className={cn('flex w-full flex-col', className)} {...props} />
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b border-border', className)}
      {...props}
    />
  )
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'group/accordion-trigger flex min-h-11 flex-1 items-center justify-between gap-4 rounded-sm py-5 text-left text-heading-4 text-balance outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
        <Plus
          aria-hidden
          strokeWidth={1.75}
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-(--spring-snappy-duration) ease-spring-snappy group-aria-expanded/accordion-trigger:rotate-45 motion-reduce:transition-none"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content data-slot="accordion-content" className="text-body text-muted-foreground" {...props}>
      <div
        className={cn(
          'max-w-[45rem] pb-5 text-pretty [&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-4 [&_p:not(:last-child)]:mb-4',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
