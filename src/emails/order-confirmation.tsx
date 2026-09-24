import { Button, Link, Section, Text } from '@react-email/components'
import { LicenseKeyBlock } from './components/license-key-block'
import { LumiraLayout } from './components/layout'
import * as s from './theme'

export type OrderConfirmationProps = {
  firstName?: string | null
  orderNumber: number
  receiptUrl: string | null
  libraryUrl: string // single-use Clerk sign-in link (P6.12)
  appUrl: string
  items: {
    productName: string
    tier: string
    version: string | null
    sizeLabel: string | null
    downloadUrl: string | null
    docsUrl: string
    licenseKey?: string | null
    activationCommand?: string | null
  }[]
}

/** FR-EM-01: per-asset download, full key in mono, activation one-liner, docs, Library link, receipt. */
export default function OrderConfirmationEmail({
  firstName,
  orderNumber,
  receiptUrl,
  libraryUrl,
  appUrl,
  items,
}: OrderConfirmationProps) {
  return (
    <LumiraLayout
      preview={`Your ${items[0]?.productName ?? 'Lumira'} license and download are ready`}
      receiptUrl={receiptUrl}
      appUrl={appUrl}
    >
      <Text style={s.h1} className="l-text">
        You&apos;re all set{firstName ? `, ${firstName}` : ''}.
      </Text>
      <Text style={s.muted} className="l-muted">
        Order #{orderNumber}. Your files and license keys are below.
      </Text>
      {items.map((item) => (
        <Section key={item.productName} style={s.card} className="l-card">
          <Text style={s.eyebrow} className="l-muted">
            {item.tier} license{item.version ? ` · v${item.version}` : ''}
          </Text>
          <Text style={s.h2} className="l-text">
            {item.productName}
          </Text>
          {item.downloadUrl ? (
            <Button href={item.downloadUrl} style={s.primaryButton} className="l-primary">
              Download {item.productName}
              {item.version ? ` v${item.version}` : ''}
              {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
            </Button>
          ) : (
            <Text style={s.muted} className="l-muted">
              The first release is on its way; it will appear in your Library.
            </Text>
          )}
          {item.licenseKey ? (
            <LicenseKeyBlock value={item.licenseKey} />
          ) : (
            <Text style={s.muted} className="l-muted">
              Your license key is being generated. We&apos;ll email it within a few minutes.
            </Text>
          )}
          {item.activationCommand ? (
            <Text style={s.code} className="l-key">
              {item.activationCommand}
            </Text>
          ) : null}
          <Link href={item.docsUrl} style={s.link} className="l-link">
            Read the getting-started guide
          </Link>
        </Section>
      ))}
      <Button href={libraryUrl} style={s.secondaryButton}>
        Open your Lumira Library
      </Button>
      <Text style={s.footnote} className="l-muted">
        Download links work for 72 hours (up to 5 downloads); after that, download any version from your Library.
        Verified owners can join the Lumira Discord from Support in your Library.
      </Text>
    </LumiraLayout>
  )
}
