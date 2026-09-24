import { Button, Link, Section, Text } from '@react-email/components'
import { LicenseKeyBlock } from './components/license-key-block'
import { LumiraLayout } from './components/layout'
import * as s from './theme'

// FR-EM-02…07 and the admin alert. Data is loaded at send time by src/lib/email/render.tsx.

export function LicenseKeyReadyEmail(p: {
  productName: string
  licenseKey: string
  activationCommand: string | null
  docsUrl: string
  libraryUrl: string
  appUrl: string
}) {
  return (
    <LumiraLayout preview={`Your ${p.productName} license key is ready`} appUrl={p.appUrl}>
      <Text style={s.h1} className="l-text">
        Your license key is ready.
      </Text>
      <Text style={s.muted} className="l-muted">
        Here is the key for {p.productName}. It is also in your Library, under Licenses.
      </Text>
      <LicenseKeyBlock value={p.licenseKey} />
      {p.activationCommand ? (
        <Text style={s.code} className="l-key">
          {p.activationCommand}
        </Text>
      ) : null}
      <Button href={p.libraryUrl} style={s.primaryButton} className="l-primary">
        Open your Library
      </Button>
      <Text style={s.text} className="l-text">
        <Link href={p.docsUrl} style={s.link} className="l-link">
          How to activate your license
        </Link>
      </Text>
    </LumiraLayout>
  )
}

export function AllAccessWelcomeEmail(p: {
  firstName?: string | null
  plan: string
  renewsOn: string | null
  licenseKey: string | null
  libraryUrl: string
  appUrl: string
}) {
  return (
    <LumiraLayout preview="Welcome to the All-Access Pass" appUrl={p.appUrl}>
      <Text style={s.h1} className="l-text">
        Welcome to All-Access{p.firstName ? `, ${p.firstName}` : ''}.
      </Text>
      <Text style={s.muted} className="l-muted">
        {p.plan} plan{p.renewsOn ? `, renews on ${p.renewsOn}` : ''}. Every asset in the catalog is now in your Library,
        with every release while your pass is active.
      </Text>
      {p.licenseKey ? (
        <LicenseKeyBlock value={p.licenseKey} />
      ) : (
        <Text style={s.muted}>Your license key is being generated.</Text>
      )}
      <Button href={p.libraryUrl} style={s.primaryButton} className="l-primary">
        Open your Library
      </Button>
      <Text style={s.text} className="l-text">
        As a verified owner you can join the Lumira Discord from Support in your Library.
      </Text>
    </LumiraLayout>
  )
}

export function ReleaseAvailableEmail(p: {
  productName: string
  version: string
  title: string
  highlights: string[]
  upgradeGuideUrl: string | null
  libraryUrl: string
  unsubscribeUrl: string
  appUrl: string
}) {
  return (
    <LumiraLayout
      preview={`${p.productName} v${p.version}: ${p.title}`}
      unsubscribeUrl={p.unsubscribeUrl}
      appUrl={p.appUrl}
    >
      <Text style={s.eyebrow} className="l-muted">
        New release
      </Text>
      <Text style={s.h1} className="l-text">
        {p.productName} v{p.version}
      </Text>
      <Text style={s.muted} className="l-muted">
        {p.title}
      </Text>
      {p.highlights.length ? (
        <Section style={s.card} className="l-card">
          {p.highlights.map((h) => (
            <Text key={h} style={{ ...s.text, margin: '0 0 8px' }} className="l-text">
              • {h}
            </Text>
          ))}
        </Section>
      ) : null}
      <Button href={p.libraryUrl} style={s.primaryButton} className="l-primary">
        Open in Library
      </Button>
      {p.upgradeGuideUrl ? (
        <Text style={s.text} className="l-text">
          <Link href={p.upgradeGuideUrl} style={s.link} className="l-link">
            Read the upgrade guide
          </Link>
        </Text>
      ) : null}
    </LumiraLayout>
  )
}

export function PaymentFailedEmail(p: {
  amount: string
  updatePaymentUrl: string
  nextAttempt: string | null
  appUrl: string
}) {
  return (
    <LumiraLayout preview="Your All-Access payment didn't go through" appUrl={p.appUrl}>
      <Text style={s.h1} className="l-text">
        Your payment didn&apos;t go through.
      </Text>
      <Text style={s.muted} className="l-muted">
        We couldn&apos;t charge {p.amount} for your All-Access Pass.
        {p.nextAttempt ? ` We'll retry on ${p.nextAttempt}.` : ''} Your access continues for now; update your card to
        keep it.
      </Text>
      <Button href={p.updatePaymentUrl} style={s.primaryButton} className="l-primary">
        Update payment method
      </Button>
    </LumiraLayout>
  )
}

export function SubscriptionEndedEmail(p: {
  state: 'cancelled' | 'expired'
  endsOn: string | null
  resumeUrl: string
  appUrl: string
}) {
  return (
    <LumiraLayout
      preview={p.state === 'cancelled' ? 'Your All-Access Pass is cancelled' : 'Your All-Access Pass has ended'}
      appUrl={p.appUrl}
    >
      <Text style={s.h1} className="l-text">
        {p.state === 'cancelled' ? 'Your pass is cancelled.' : 'Your pass has ended.'}
      </Text>
      <Text style={s.muted} className="l-muted">
        {p.state === 'cancelled'
          ? `You keep full access until ${p.endsOn ?? 'the end of this billing period'}.`
          : 'Releases published while your pass was active stay downloadable from your Library.'}{' '}
        New releases after that need an active pass or a one-time license.
      </Text>
      <Button href={p.resumeUrl} style={s.secondaryButton}>
        {p.state === 'cancelled' ? 'Resume my pass' : 'See All-Access plans'}
      </Button>
    </LumiraLayout>
  )
}

export function RefundProcessedEmail(p: {
  orderNumber: number
  amount: string
  receiptUrl: string | null
  appUrl: string
}) {
  return (
    <LumiraLayout preview={`Refund for order #${p.orderNumber} processed`} receiptUrl={p.receiptUrl} appUrl={p.appUrl}>
      <Text style={s.h1} className="l-text">
        Your refund is on its way.
      </Text>
      <Text style={s.muted} className="l-muted">
        We refunded {p.amount} for order #{p.orderNumber}. The license key for this order is now disabled and its
        downloads are no longer available. Refunds usually reach your account within 5–10 business days.
      </Text>
    </LumiraLayout>
  )
}

export function AdminAlertEmail(p: { title: string; lines: string[]; url: string; appUrl: string }) {
  return (
    <LumiraLayout preview={p.title} appUrl={p.appUrl}>
      <Text style={s.h1} className="l-text">
        {p.title}
      </Text>
      {p.lines.map((l) => (
        <Text key={l} style={{ ...s.text, fontFamily: s.fontMono, fontSize: 13 }} className="l-text">
          {l}
        </Text>
      ))}
      <Button href={p.url} style={s.primaryButton} className="l-primary">
        Open admin
      </Button>
    </LumiraLayout>
  )
}

export function SupportRequestEmail(p: { from: string; message: string; context: string[]; appUrl: string }) {
  return (
    <LumiraLayout preview={`Support request from ${p.from}`} appUrl={p.appUrl}>
      <Text style={s.h1} className="l-text">
        Support request
      </Text>
      <Text style={s.muted} className="l-muted">
        From {p.from}. Reply to this email to answer the buyer directly.
      </Text>
      {p.context.map((line) => (
        <Text
          key={line}
          style={{ ...s.text, fontFamily: s.fontMono, fontSize: 13, margin: '0 0 4px' }}
          className="l-text"
        >
          {line}
        </Text>
      ))}
      <Section style={{ marginTop: 16 }}>
        {p.message.split(/\n{2,}/).map((para, i) => (
          <Text key={i} style={{ ...s.text, whiteSpace: 'pre-wrap' }} className="l-text">
            {para}
          </Text>
        ))}
      </Section>
    </LumiraLayout>
  )
}
