import { defineArrayMember, defineField, defineType } from 'sanity'

const plan = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: 'object',
    fields: [
      defineField({ name: 'lsVariantId', type: 'number', validation: (r) => r.integer().positive() }),
      defineField({ name: 'priceCents', type: 'number', readOnly: true, description: 'Synced from Lemon Squeezy' }),
      defineField({ name: 'buyUrl', type: 'url' }),
    ],
  })

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', initialValue: 'Site settings', readOnly: true }),
    defineField({
      name: 'promoBanner',
      type: 'object',
      description: 'Dismissible top bar (FR-GL-05). Toggled from the admin discount screen.',
      fields: [
        defineField({ name: 'enabled', type: 'boolean', initialValue: false }),
        defineField({ name: 'text', type: 'string', validation: (r) => r.max(90) }),
        defineField({ name: 'code', type: 'string', validation: (r) => r.regex(/^[A-Z0-9]{3,64}$/) }),
        defineField({ name: 'href', type: 'string' }),
      ],
    }),
    defineField({
      name: 'affiliate',
      type: 'object',
      fields: [
        defineField({
          name: 'commissionRate',
          type: 'number',
          initialValue: 30,
          validation: (r) => r.required().min(1).max(80),
        }),
        defineField({
          name: 'cookieDays',
          type: 'number',
          initialValue: 30,
          validation: (r) => r.required().min(1).max(365),
        }),
        defineField({ name: 'payoutNote', type: 'string' }),
      ],
    }),
    defineField({
      name: 'allAccess',
      title: 'All-Access Pass',
      type: 'object',
      fields: [
        defineField({ name: 'lsProductId', type: 'number', validation: (r) => r.integer().positive() }),
        plan('monthly', 'Monthly'),
        plan('yearly', 'Yearly'),
        defineField({ name: 'activationLimit', type: 'number', initialValue: 10 }),
        defineField({ name: 'perks', type: 'array', of: [defineArrayMember({ type: 'string' })] }),
      ],
    }),
    defineField({
      name: 'social',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string', validation: (r) => r.required() }),
            defineField({ name: 'url', type: 'url', validation: (r) => r.required() }),
          ],
        }),
      ],
    }),
    defineField({ name: 'supportEmail', type: 'string', initialValue: 'support@lumira.dev' }),
    defineField({ name: 'statusUrl', type: 'url' }),
  ],
})
