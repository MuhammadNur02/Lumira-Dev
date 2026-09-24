import { MIN_SPAN, PRESETS, validateBands, type Band, type TileKind } from '@lumira/bento'
import { defineArrayMember, defineField, defineType } from 'sanity'

const TILE_KINDS: TileKind[] = [
  'featuredProduct',
  'video',
  'allAccessPromo',
  'stat',
  'testimonial',
  'changelogTeaser',
  'docsTeaser',
  'stackBadges',
]

const kindOf = (parent: unknown) => (parent as { kind?: string } | undefined)?.kind ?? ''

const tileFields = [
  defineField({ name: 'kind', type: 'string', options: { list: TILE_KINDS }, validation: (r) => r.required() }),
  defineField({ name: 'eyebrow', type: 'string' }),
  defineField({ name: 'title', type: 'string' }),
  defineField({ name: 'body', type: 'text', rows: 2 }),
  defineField({
    name: 'product',
    type: 'reference',
    to: [{ type: 'product' }],
    hidden: ({ parent }) => !['featuredProduct', 'docsTeaser', 'stackBadges'].includes(kindOf(parent)),
  }),
  defineField({
    name: 'testimonial',
    type: 'reference',
    to: [{ type: 'testimonial' }],
    hidden: ({ parent }) => kindOf(parent) !== 'testimonial',
  }),
  defineField({
    name: 'stat',
    type: 'object',
    hidden: ({ parent }) => kindOf(parent) !== 'stat',
    fields: [
      defineField({ name: 'value', type: 'string', description: 'Real, verifiable figures only (StyleGuide §8)' }),
      defineField({ name: 'label', type: 'string' }),
      defineField({
        name: 'source',
        type: 'string',
        options: { list: ['manual', 'assetCount', 'releaseCount'] },
        initialValue: 'manual',
      }),
    ],
  }),
  defineField({
    name: 'video',
    type: 'file',
    options: { accept: 'video/webm,video/mp4' },
    hidden: ({ parent }) => kindOf(parent) !== 'video',
  }),
  defineField({ name: 'poster', type: 'image', hidden: ({ parent }) => kindOf(parent) !== 'video' }),
  defineField({ name: 'snippet', type: 'text', rows: 6, hidden: ({ parent }) => kindOf(parent) !== 'docsTeaser' }),
  defineField({ name: 'href', type: 'string', description: 'Optional link override' }),
]

export const bentoTile = defineType({
  name: 'bentoTile',
  title: 'Bento tile',
  type: 'object',
  fields: [
    ...tileFields,
    defineField({ name: 'cols', type: 'number', validation: (r) => r.required().integer().min(3).max(12) }),
    defineField({ name: 'rows', type: 'number', options: { list: [1, 2, 3] }, validation: (r) => r.required() }),
    defineField({ name: 'hero', type: 'boolean', initialValue: false }),
    defineField({
      name: 'stack',
      title: 'Stacked pair (stacked-* presets)',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'stackedTile',
          fields: [...tileFields, defineField({ name: 'rows', type: 'number', initialValue: 1 })],
          preview: { select: { title: 'kind', subtitle: 'title' } },
        }),
      ],
      validation: (r) => r.max(2),
    }),
  ],
  validation: (r) =>
    r.custom((tile) => {
      const t = tile as { kind?: TileKind; cols?: number; rows?: number; stack?: unknown[] } | undefined
      if (!t?.kind || t.stack?.length) return true
      const [minCols, minRows] = MIN_SPAN[t.kind]
      return (t.cols ?? 0) >= minCols && (t.rows ?? 0) >= minRows
        ? true
        : `${t.kind} needs at least ${minCols} × ${minRows} (StyleGuide §4.4)`
    }),
  preview: {
    select: { kind: 'kind', title: 'title', cols: 'cols', rows: 'rows', product: 'product.name' },
    prepare: ({ kind, title, cols, rows, product }) => ({
      title: `${kind} · ${cols}×${rows}`,
      subtitle: product ?? title,
    }),
  },
})

type RawTile = {
  kind: TileKind
  cols: number
  rows: number
  hero?: boolean
  stack?: { kind: TileKind; rows?: number }[]
}
type RawBand = { preset?: string; rows?: number; tiles?: RawTile[] }

/** Maps the stored bands to the validator's shape (stacked children inherit the parent's columns). */
export function toBands(value: unknown): Band[] {
  return ((value ?? []) as RawBand[]).map((b) => ({
    preset: b.preset ?? '',
    rows: (b.rows ?? 2) as 1 | 2 | 3,
    tiles: (b.tiles ?? []).map((t) => ({
      kind: t.kind,
      cols: t.cols,
      rows: t.rows,
      hero: t.hero,
      stack: t.stack?.length ? t.stack.map((s) => ({ kind: s.kind, cols: t.cols, rows: s.rows ?? 1 })) : undefined,
    })),
  }))
}

export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', initialValue: 'Home', readOnly: true }),
    defineField({
      name: 'hero',
      type: 'object',
      fields: [
        defineField({ name: 'eyebrow', type: 'string' }),
        defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(60) }),
        defineField({ name: 'lead', type: 'text', rows: 2, validation: (r) => r.max(180) }),
      ],
    }),
    defineField({
      name: 'bands',
      title: 'Bento bands',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'band',
          fields: [
            defineField({
              name: 'preset',
              type: 'string',
              options: { list: [...PRESETS] },
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'rows',
              type: 'number',
              options: { list: [1, 2, 3] },
              initialValue: 2,
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'tiles',
              type: 'array',
              of: [defineArrayMember({ type: 'bentoTile' })],
              validation: (r) => r.min(1).max(4),
            }),
          ],
          preview: {
            select: { title: 'preset', tiles: 'tiles' },
            prepare: ({ title, tiles }) => ({
              title,
              subtitle: `${(tiles as unknown[] | undefined)?.length ?? 0} tiles`,
            }),
          },
        }),
      ],
      // The same validator the site runs at render time (@lumira/bento, StyleGuide §4.3).
      validation: (r) =>
        r.custom((value) => {
          const errors = validateBands(toBands(value))
          return errors.length ? errors.join(' · ') : true
        }),
    }),
    defineField({
      name: 'previewTeaser',
      type: 'object',
      fields: [
        defineField({ name: 'title', type: 'string' }),
        defineField({ name: 'body', type: 'text', rows: 2 }),
        defineField({ name: 'video', type: 'file', options: { accept: 'video/webm,video/mp4' } }),
        defineField({ name: 'poster', type: 'image' }),
        defineField({ name: 'product', type: 'reference', to: [{ type: 'product' }] }),
      ],
    }),
    defineField({
      name: 'testimonials',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'testimonial' }] })],
      validation: (r) => r.max(6),
    }),
    defineField({ name: 'faq', type: 'array', of: [defineArrayMember({ type: 'reference', to: [{ type: 'faq' }] })] }),
    defineField({
      name: 'closingCta',
      type: 'object',
      fields: [defineField({ name: 'title', type: 'string' }), defineField({ name: 'body', type: 'text', rows: 2 })],
    }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
})
