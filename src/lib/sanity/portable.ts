import type { PortableTextBlock } from '@portabletext/react'

let keySeq = 0
const key = () => `pt${(++keySeq).toString(36)}`

/** Builds a Portable Text block from plain text (seed content, generated FAQ answers). */
export function block(text: string, style: 'normal' | 'h3' | 'blockquote' = 'normal'): PortableTextBlock {
  return {
    _type: 'block',
    _key: key(),
    style,
    markDefs: [],
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  } as PortableTextBlock
}
