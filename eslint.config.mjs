import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

// ---------------------------------------------------------------------------------------------
// Local rules (Task.md P1.03, StyleGuide §10)
// ---------------------------------------------------------------------------------------------

/** `#abc`, `#abcd`, `#aabbcc`, `#aabbccdd` as a standalone color, or any `oklch(` call. */
const COLOR_LITERAL = /(?:^|[\s"'`:(,=[])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])|oklch\(/i

const isClientModule = (program) =>
  program.body.some((node) => node.type === 'ExpressionStatement' && node.directive === 'use client')

const lumira = {
  rules: {
    'no-color-literals': {
      meta: {
        type: 'problem',
        messages: {
          literal:
            'Color literal "{{value}}": use a design token (StyleGuide §10). Hex equivalents for emails, OG images and third-party widgets live in src/lib/brand-hex.ts.',
        },
      },
      create(context) {
        const check = (node, raw) => {
          if (typeof raw === 'string' && COLOR_LITERAL.test(raw)) {
            context.report({ node, messageId: 'literal', data: { value: raw.slice(0, 60) } })
          }
        }
        return {
          Literal: (node) => check(node, node.value),
          TemplateElement: (node) => check(node, node.value.raw),
          JSXText: (node) => check(node, node.value),
        }
      },
    },
    'no-server-imports-in-client': {
      meta: {
        type: 'problem',
        messages: {
          server:
            '"{{source}}" is server-only. Client components must not import the database or server modules; pass data from a Server Component or call a Server Action.',
        },
      },
      create(context) {
        let client = false
        return {
          Program: (program) => {
            client = isClientModule(program)
          },
          ImportDeclaration: (node) => {
            if (!client || node.importKind === 'type') return
            const source = String(node.source.value)
            if (/^@\/(db|server)(\/|$)/.test(source) || source === 'server-only') {
              context.report({ node, messageId: 'server', data: { source } })
            }
          },
        }
      },
    },
    'admin-actions-audited': {
      meta: {
        type: 'problem',
        messages: {
          audit:
            'Admin Server Actions must record every mutation through withAudit() from "@/server/admin/audit" (Task.md P7.01).',
        },
      },
      create(context) {
        let imported = false
        return {
          ImportDeclaration: (node) => {
            if (node.source.value === '@/server/admin/audit') imported = true
          },
          'Program:exit': (program) => {
            if (!imported) context.report({ node: program, messageId: 'audit' })
          },
        }
      },
    },
  },
}

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { lumira },
    rules: {
      'lumira/no-color-literals': 'error',
      'lumira/no-server-imports-in-client': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'motion/react',
              importNames: ['motion'],
              message: "Use `import * as m from 'motion/react-m'` with LazyMotion (StyleGuide §6.3).",
            },
            { name: 'framer-motion', message: "Import from 'motion/react' (Motion is the successor)." },
            { name: '@radix-ui/react-slot', message: "Import { Slot } from 'radix-ui' (shadcn 4.x)." },
            {
              name: 'cn',
              message:
                "Import { cn } from '@/lib/utils'. The bare package does not know Lumira's type scale and drops text-micro/text-caption next to a text color.",
            },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    },
  },
  {
    // The one place hex equivalents of the tokens may live (emails, OG images, theme-color, LS overlay).
    // chart.tsx targets Recharts' default `stroke='#ccc'` attribute in a selector; it sets no color.
    files: ['src/lib/brand-hex.ts', 'src/components/ui/chart.tsx', 'scripts/**', 'tests/**'],
    rules: { 'lumira/no-color-literals': 'off' },
  },
  {
    files: ['src/app/(app)/admin/**/actions.ts'],
    rules: { 'lumira/admin-actions-audited': 'error' },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'src/db/migrations/**',
    'src/sanity/types.ts',
    'studio/**',
    'packages/*/dist/**',
    '.source/**',
  ]),
])
