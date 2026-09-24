import type { PortableTextBlock } from '@portabletext/react'

let keySeq = 0
const key = () => `pt${(++keySeq).toString(36)}`

/**
 * Builds a Portable Text block from plain text (seed content, generated FAQ answers). `backtick`
 * segments become spans with the `code` decorator, exactly what the Studio's editor produces, so
 * fixtures render inline code instead of literal backticks.
 */
export function block(text: string, style: 'normal' | 'h3' | 'blockquote' = 'normal'): PortableTextBlock {
  const children = text
    .split(/(`[^`]+`)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('`') && part.endsWith('`')
        ? { _type: 'span', _key: key(), text: part.slice(1, -1), marks: ['code'] }
        : { _type: 'span', _key: key(), text: part, marks: [] },
    )
  return { _type: 'block', _key: key(), style, markDefs: [], children } as PortableTextBlock
}
