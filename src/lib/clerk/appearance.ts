import { shadcn } from '@clerk/ui/themes'

/**
 * Clerk reads Lumira's shadcn CSS variables through the `shadcn` base theme (StyleGuide §5.8), so
 * theme changes propagate without JS. Clerk styles sit in the `clerk` layer, below utilities.
 */
export const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  variables: {
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-geist-sans)',
    fontFamilyButtons: 'var(--font-geist-sans)',
  },
  elements: {
    cardBox: 'rounded-bento border border-bento-border shadow-bento',
    formButtonPrimary: 'h-10 rounded-md text-sm font-medium shadow-button-ink',
    formFieldInput: 'h-10 rounded-md border-input',
    footerActionLink: 'text-brand-text',
  },
}
