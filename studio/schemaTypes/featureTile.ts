import { defineField, defineType } from 'sanity'

export const featureTile = defineType({
  name: 'featureTile',
  title: 'Feature tile',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({ name: 'title', type: 'string', validation: (r) => r.required().max(60) }),
    defineField({ name: 'body', type: 'text', rows: 3, validation: (r) => r.max(160) }),
    defineField({ name: 'icon', type: 'string', description: 'Lucide icon name, e.g. "shield-check"' }),
    defineField({
      name: 'size',
      type: 'string',
      options: { list: ['sm', 'md', 'lg'], layout: 'radio' },
      initialValue: 'md',
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'eyebrow' } },
})
