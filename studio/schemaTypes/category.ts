import { defineField, defineType } from 'sanity'

export const category = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: (r) => r.required() }),
    defineField({
      name: 'line',
      type: 'string',
      options: { list: ['boilerplate', 'ui_kit', 'template'] },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'tagline', type: 'string', validation: (r) => r.max(90) }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
})
