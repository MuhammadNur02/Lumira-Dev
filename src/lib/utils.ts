import { createCn } from 'cn/config'

/**
 * Class merging with Lumira's design tokens registered (StyleGuide §3.2, §1.3, §1.4).
 *
 * Without this, the merger only knows Tailwind's default scale and classifies any unknown
 * `text-*` utility as a text *color*. `cn('text-micro text-foreground')` then drops the font size
 * as a "conflicting color", silently rendering every caption, badge and version pill at 16 px.
 * The same applies to custom shadows and radii. Every component must import `cn` from here,
 * never from the `cn` package directly (enforced by the `no-restricted-imports` lint rule).
 */
export const cn = createCn({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display-2xl',
            'display-xl',
            'display-lg',
            'heading-1',
            'heading-2',
            'heading-3',
            'heading-4',
            'body-lg',
            'body',
            'body-sm',
            'caption',
            'micro',
            'key',
            'metric',
            'metric-hero',
          ],
        },
      ],
      shadow: [{ shadow: ['bento', 'raised', 'modal', 'overlay', 'button-ink', 'button-brand', 'button-brand-hover'] }],
      rounded: [{ rounded: ['bento', 'device'] }],
    },
  },
})
