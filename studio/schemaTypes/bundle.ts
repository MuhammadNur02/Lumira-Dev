import { defineArrayMember, defineField, defineType } from 'sanity'

export const bundle = defineType({
  name: 'bundle',
  title: 'Bundle',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({ name: 'tagline', type: 'string', validation: (r) => r.max(90) }),
    defineField({
      name: 'hero',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', type: 'string' })],
    }),
    defineField({
      name: 'tier',
      type: 'string',
      options: { list: ['personal', 'team', 'extended'] },
      initialValue: 'team',
    }),
    defineField({ name: 'lsProductId', type: 'number', validation: (r) => r.required().integer().positive() }),
    defineField({ name: 'lsVariantId', type: 'number', validation: (r) => r.required().integer().positive() }),
    defineField({ name: 'priceCents', type: 'number', readOnly: true, description: 'Synced from Lemon Squeezy' }),
    defineField({ name: 'buyUrl', type: 'url' }),
    defineField({
      name: 'includes',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'product' }] })],
      validation: (r) => r.required().min(2),
    }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
})
