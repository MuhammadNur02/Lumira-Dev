import { OG_SIZE, ogCard } from '@/lib/og'

export const size = OG_SIZE
export const contentType = 'image/png'
export const alt = 'Lumira — premium web assets'

export default function Image() {
  return ogCard({
    eyebrow: 'Premium web assets',
    title: 'Ship on foundations you can trust.',
    subtitle: 'Boilerplates, UI kits and templates. Try every one live, own every version.',
  })
}
