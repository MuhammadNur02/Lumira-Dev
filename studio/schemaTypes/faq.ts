import { defineArrayMember, defineField, defineType } from 'sanity'

export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  fields: [
    defineField({ name: 'question', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'answer',
      type: 'array',
      of: [defineArrayMember({ type: 'block' })],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'topic',
      type: 'string',
      options: { list: ['licensing', 'billing', 'delivery', 'all-access', 'support', 'general'] },
    }),
  ],
  preview: { select: { title: 'question', subtitle: 'topic' } },
})
