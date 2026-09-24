import 'server-only'
import { cacheLife } from 'next/cache'
import { codeToHtml } from 'shiki'

export type HighlightLang = 'bash' | 'tsx' | 'ts' | 'json' | 'dotenv' | 'text'

/**
 * Server-side Shiki with dual themes through CSS variables (SG §2.4): switching themes never
 * re-renders code. Output is cached per (code, lang), so highlighting runs once per snippet.
 */
export async function highlight(code: string, lang: HighlightLang = 'tsx'): Promise<string> {
  'use cache'
  cacheLife('max')
  return codeToHtml(code, {
    lang: lang === 'dotenv' ? 'ini' : lang,
    themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    defaultColor: false,
  })
}
