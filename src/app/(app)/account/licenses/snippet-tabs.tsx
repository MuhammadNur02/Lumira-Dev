'use client'

import { CopyButton } from '@/components/lumira/copy-button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { revealLicenseKey } from './actions'

const MASK = '••••••••-••••-••••-••••-••••••••'

const SNIPPETS = {
  cli: {
    label: 'CLI',
    file: 'Terminal',
    render: (key: string) => `LUMIRA_LICENSE_KEY=${key} npx lumira@latest activate`,
  },
  env: { label: '.env', file: '.env.local', render: (key: string) => `LUMIRA_LICENSE_KEY=${key}` },
  registry: {
    label: 'components.json',
    file: 'components.json',
    render: () =>
      JSON.stringify(
        {
          registries: {
            '@lumira': {
              url: 'https://lumira.dev/r/{name}.json',
              headers: { Authorization: 'Bearer ${LUMIRA_LICENSE_KEY}' },
            },
          },
        },
        null,
        2,
      ),
  },
} as const

type Kind = keyof typeof SNIPPETS

/**
 * Install snippets (FR-BD-04). Shown with the masked key; copying reveals through the audited
 * Server Action so the plaintext only ever lands on the clipboard.
 */
export function SnippetTabs({ keyId, last4, registry }: { keyId: string; last4: string; registry: boolean }) {
  const kinds = (Object.keys(SNIPPETS) as Kind[]).filter((k) => k !== 'registry' || registry)
  return (
    <Tabs defaultValue="cli" className="gap-3">
      <TabsList aria-label="Install snippets">
        {kinds.map((kind) => (
          <TabsTrigger key={kind} value={kind}>
            {SNIPPETS[kind].label}
          </TabsTrigger>
        ))}
      </TabsList>
      {kinds.map((kind) => {
        const snippet = SNIPPETS[kind]
        return (
          <TabsContent key={kind} value={kind}>
            <figure className="ph-no-capture overflow-hidden rounded-lg border border-bento-border bg-muted/40">
              <figcaption className="flex h-10 items-center justify-between gap-2 border-b border-bento-border pr-1 pl-4">
                <span className="truncate font-mono text-micro text-muted-foreground">{snippet.file}</span>
                <CopyButton
                  label={`Copy ${snippet.label} snippet`}
                  copiedLabel="Snippet copied"
                  getValue={async () => snippet.render(kind === 'registry' ? '' : await revealLicenseKey(keyId))}
                />
              </figcaption>
              <pre className="overflow-x-auto px-4 py-3 font-mono text-[13px] leading-relaxed">
                <code>{snippet.render(`${MASK}${last4}`)}</code>
              </pre>
            </figure>
          </TabsContent>
        )
      })}
    </Tabs>
  )
}
