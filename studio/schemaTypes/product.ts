import { defineArrayMember, defineField, defineType } from 'sanity'

const CAPABILITIES = [
  { title: 'Auth', value: 'auth' },
  { title: 'Payments', value: 'payments' },
  { title: 'i18n', value: 'i18n' },
  { title: 'CMS', value: 'cms' },
  { title: 'Dark mode', value: 'dark-mode' },
  { title: 'Animations', value: 'animations' },
  { title: 'Multi-tenant', value: 'multi-tenant' },
  { title: 'Figma file', value: 'figma' },
]

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  groups: [{ name: 'content', default: true }, { name: 'commerce' }, { name: 'demo' }, { name: 'seo' }],
  fields: [
    defineField({ name: 'name', type: 'string', group: 'content', validation: (r) => r.required().max(60) }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      options: { source: 'name', maxLength: 64 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'line',
      type: 'string',
      group: 'content',
      options: { list: ['boilerplate', 'ui_kit', 'template'], layout: 'radio' },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'templateType',
      type: 'string',
      group: 'content',
      options: { list: ['portfolio', 'landing', 'docs', 'blog'] },
      hidden: ({ document }) => document?.line !== 'template',
    }),
    defineField({ name: 'tagline', type: 'string', group: 'content', validation: (r) => r.required().max(90) }),
    defineField({ name: 'description', type: 'array', group: 'content', of: [defineArrayMember({ type: 'block' })] }),
    defineField({
      name: 'hero',
      type: 'image',
      group: 'content',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string', validation: (r) => r.required() })],
      validation: (r) => r.required(),
    }),
    defineField({ name: 'heroDark', type: 'image', group: 'content', options: { hotspot: true } }),
    defineField({
      name: 'hoverVideo',
      type: 'file',
      group: 'content',
      options: { accept: 'video/webm,video/mp4' },
      description: '1280 × 800, 8 s seamless loop, no audio, ≤ 1.5 MB (StyleGuide §8)',
    }),
    defineField({
      name: 'stack',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'techStack' }] })],
      validation: (r) => r.max(6),
    }),
    defineField({
      name: 'capabilities',
      type: 'array',
      group: 'content',
      description: 'Drives the catalog feature filters (FR-SF-04)',
      of: [defineArrayMember({ type: 'string' })],
      options: { list: CAPABILITIES },
    }),
    defineField({
      name: 'features',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'featureTile' })],
    }),
    defineField({
      name: 'fileTree',
      type: 'text',
      group: 'content',
      description: 'Output of `tree -L 2`, rendered in Geist Mono',
    }),
    defineField({
      name: 'faq',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'faq' }] })],
    }),
    defineField({
      name: 'related',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'product' }] })],
      validation: (r) => r.max(3),
    }),
    defineField({
      name: 'popularity',
      type: 'number',
      group: 'commerce',
      description: 'Sort weight for "Popular" (higher first)',
      initialValue: 0,
    }),
    defineField({
      name: 'licenses',
      type: 'array',
      group: 'commerce',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'license',
          fields: [
            defineField({
              name: 'tier',
              type: 'string',
              options: { list: ['personal', 'team', 'extended'] },
              validation: (r) => r.required(),
            }),
            defineField({ name: 'lsProductId', type: 'number', validation: (r) => r.required().integer().positive() }),
            defineField({ name: 'lsVariantId', type: 'number', validation: (r) => r.required().integer().positive() }),
            defineField({
              name: 'priceCents',
              type: 'number',
              readOnly: true,
              description: 'Synced from Lemon Squeezy (P5.02)',
            }),
            defineField({ name: 'activationLimit', type: 'number', readOnly: true }),
            defineField({ name: 'buyUrl', type: 'url', description: 'Hosted checkout fallback (PRD §6.7)' }),
            defineField({ name: 'rights', type: 'array', of: [defineArrayMember({ type: 'string' })] }),
          ],
          preview: { select: { title: 'tier', subtitle: 'lsVariantId' } },
        }),
      ],
      validation: (r) =>
        r
          .required()
          .min(1)
          .custom((licenses) => {
            const tiers = (licenses as { tier?: string }[] | undefined)?.map((l) => l.tier) ?? []
            return new Set(tiers).size === tiers.length ? true : 'Each tier may appear once'
          }),
    }),
    defineField({ name: 'inAllAccess', type: 'boolean', group: 'commerce', initialValue: true }),
    defineField({
      name: 'demo',
      type: 'object',
      group: 'demo',
      fields: [
        defineField({
          name: 'origin',
          type: 'url',
          validation: (r) =>
            r
              .uri({ scheme: ['https'] })
              .custom((v) =>
                !v || /^https:\/\/[a-z0-9-]+\.lumira-demos\.dev$/.test(v)
                  ? true
                  : 'Must be https://{slug}.lumira-demos.dev',
              ),
        }),
        defineField({
          name: 'pages',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'object',
              fields: [
                defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
                defineField({ name: 'path', type: 'string', validation: (r) => r.required().regex(/^\//) }),
              ],
            }),
          ],
        }),
        defineField({ name: 'supportsTheme', type: 'boolean', initialValue: false }),
        defineField({
          name: 'gallery',
          type: 'array',
          of: [
            defineArrayMember({
              type: 'image',
              fields: [
                defineField({ name: 'device', type: 'string', options: { list: ['desktop', 'tablet', 'mobile'] } }),
                defineField({ name: 'alt', type: 'string' }),
              ],
            }),
          ],
        }),
        defineField({
          name: 'lighthouse',
          type: 'object',
          fields: ['performance', 'accessibility', 'bestPractices', 'seo'].map((name) =>
            defineField({ name, type: 'number', validation: (r) => r.min(0).max(100) }),
          ),
        }),
      ],
    }),
    defineField({
      name: 'components',
      title: 'Playground components (UI kits)',
      type: 'array',
      group: 'demo',
      hidden: ({ document }) => document?.line !== 'ui_kit',
      description: 'Rail of the Component Playground (FR-LP-08); each renders at /c/{name} on the demo origin',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'component',
          fields: [
            defineField({ name: 'name', type: 'string', validation: (r) => r.required().regex(/^[a-z0-9-]+$/) }),
            defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'description', type: 'string' }),
            defineField({
              name: 'code',
              type: 'text',
              rows: 12,
              description: 'Source excerpt; non-owners see the first 30 lines',
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'name' } },
        }),
      ],
    }),
    defineField({ name: 'seo', type: 'seo', group: 'seo' }),
  ],
  preview: { select: { title: 'name', subtitle: 'line', media: 'hero' } },
})
