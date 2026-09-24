import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

// Regression: the bare `cn` package classified Lumira's type scale as text colors, so every
// `text-micro text-foreground` pair lost its font size and badges rendered at 16 px.
describe('cn with Lumira tokens', () => {
  it.each([
    ['text-micro text-foreground'],
    ['text-caption text-muted-foreground'],
    ['text-body-sm text-destructive'],
    ['text-key text-foreground'],
    ['text-heading-4 text-brand-text'],
    ['text-display-lg text-primary-foreground'],
    ['text-metric text-success'],
  ])('keeps the font size next to a text color: %s', (classes) => {
    expect(cn(classes)).toBe(classes)
  })

  it('still resolves real conflicts to the last class', () => {
    expect(cn('text-sm', 'text-micro')).toBe('text-micro')
    expect(cn('text-micro', 'text-caption')).toBe('text-caption')
    expect(cn('text-foreground', 'text-muted-foreground')).toBe('text-muted-foreground')
    expect(cn('shadow-raised', 'shadow-modal')).toBe('shadow-modal')
    expect(cn('shadow-button-ink', 'shadow-none')).toBe('shadow-none')
    expect(cn('rounded-bento', 'rounded-lg')).toBe('rounded-lg')
  })

  it('keeps clsx semantics', () => {
    expect(cn('px-2', false && 'hidden', { 'text-micro': true, 'text-body': false })).toBe('px-2 text-micro')
  })
})
