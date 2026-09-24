import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { and, eq, inArray } from 'drizzle-orm'
import { CodeBlock } from '@/components/lumira/code-block'
import { db } from '@/db/client'
import { licenseKeys, products, variants } from '@/db/schema'

type Kind = 'cli' | 'env'

const PLACEHOLDER = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

function snippet(kind: Kind, key: string) {
  return kind === 'cli' ? `LUMIRA_LICENSE_KEY=${key} npx lumira@latest activate` : `LUMIRA_LICENSE_KEY=${key}`
}

/** A masked reference to the signed-in owner's key for this product ("…-4d51"), never the key. */
async function maskedKeyFor(userId: string, productSlug: string): Promise<string | null> {
  const product = await db.query.products.findFirst({ where: eq(products.slug, productSlug), columns: { id: true } })
  if (!product) return null
  const lsProductIds = (
    await db.select({ id: variants.lsProductId }).from(variants).where(eq(variants.productId, product.id))
  ).map((v) => v.id)
  if (!lsProductIds.length) return null
  const key = await db.query.licenseKeys.findFirst({
    where: and(
      eq(licenseKeys.userId, userId),
      inArray(licenseKeys.lsProductId, lsProductIds),
      inArray(licenseKeys.status, ['inactive', 'active']),
    ),
    columns: { keyShort: true },
  })
  return key ? `••••••••-••••-••••-••••-••••••••${key.keyShort.slice(-4)}` : null
}

async function OwnerSnippet({ kind, product }: { kind: Kind; product: string }) {
  const { userId } = await auth()
  const masked = userId ? await maskedKeyFor(userId, product).catch(() => null) : null
  return (
    <div className="not-prose my-4 flex flex-col gap-2">
      <CodeBlock
        code={snippet(kind, masked ?? PLACEHOLDER)}
        lang="bash"
        title={kind === 'cli' ? 'Terminal' : '.env.local'}
        copy={!masked}
      />
      <p className="text-caption text-muted-foreground">
        {masked ? (
          <>
            Your key ending in <span className="font-mono">{masked.slice(-4)}</span>. Reveal and copy it from{' '}
            <a href="/account/licenses" className="text-brand-text underline underline-offset-4">
              Licenses
            </a>
            .
          </>
        ) : (
          'Replace the placeholder with your license key from your Library.'
        )}
      </p>
    </div>
  )
}

/** `LicenseSnippet` MDX component (FR-DOC-06): owner-aware install snippet with a masked key. */
export function LicenseSnippet({ kind = 'cli', product }: { kind?: Kind; product: string }) {
  return (
    <Suspense
      fallback={
        <CodeBlock
          code={snippet(kind, PLACEHOLDER)}
          lang="bash"
          title={kind === 'cli' ? 'Terminal' : '.env.local'}
          className="not-prose my-4"
        />
      }
    >
      <OwnerSnippet kind={kind} product={product} />
    </Suspense>
  )
}
