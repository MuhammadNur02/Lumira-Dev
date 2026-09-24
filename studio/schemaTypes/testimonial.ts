import { defineField, defineType } from 'sanity'

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    defineField({ name: 'quote', type: 'text', rows: 4, validation: (r) => r.required().max(280) }),
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'role', type: 'string' }),
    defineField({ name: 'company', type: 'string' }),
    defineField({ name: 'avatar', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'product', type: 'reference', to: [{ type: 'product' }] }),
    defineField({
      name: 'permissionGranted',
      title: 'Permission to publish',
      type: 'boolean',
      description: 'Real, attributed testimonials only (PRD FR-SF-02). Required before publishing.',
      initialValue: false,
      validation: (r) => r.custom((v) => (v === true ? true : 'Confirm written permission before publishing')),
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'company', media: 'avatar' } },
})
