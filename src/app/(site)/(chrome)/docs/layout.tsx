import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { RootProvider } from 'fumadocs-ui/provider/next'
import { source } from '@/lib/docs/source'

/**
 * Docs shell (P4.13). next-themes in the root layout owns theme state, and the site ⌘K palette
 * owns search (it queries /api/search), so both Fumadocs toggles are off. The sidebar sticks under
 * the condensed site header (56 px).
 */
export default function DocsRootLayout({ children }: LayoutProps<'/docs'>) {
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsLayout
        tree={source.pageTree}
        nav={{ enabled: false }}
        themeSwitch={{ enabled: false }}
        searchToggle={{ enabled: false }}
        containerProps={{
          style: { '--fd-banner-height': '56px', '--fd-docs-height': 'calc(100dvh - 56px)' } as React.CSSProperties,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  )
}
