import { defineField, defineType } from 'sanity'

export const techStack = defineType({
  name: 'techStack',
  title: 'Tech stack',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'name' }, validation: (r) => r.required() }),
    defineField({
      name: 'kind',
      type: 'string',
      options: { list: ['framework', 'styling', 'library', 'service', 'runtime'] },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'logo',
      type: 'text',
      rows: 4,
      description: 'Official monochrome mark as inline SVG using currentColor (StyleGuide §5.7)',
      validation: (r) =>
        r.custom((v) => (!v || /^<svg[\s\S]*<\/svg>\s*$/.test(v) ? true : 'Paste a single <svg> element')),
    }),
    defineField({ name: 'version', type: 'string', description: 'Shown in mono, e.g. 16.3' }),
  ],
  preview: { select: { title: 'name', subtitle: 'version' } },
})
