import { Body, Container, Font, Head, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import * as s from '../theme'

/**
 * Shared email frame (SG §5.10): 600 px container, Geist with system fallbacks, light and dark,
 * `lang="en"`, the MoR footer; the unsubscribe link only on release notices.
 */
export function LumiraLayout({
  preview,
  children,
  receiptUrl,
  unsubscribeUrl,
  appUrl = 'https://lumira.dev',
}: {
  preview: string
  children: React.ReactNode
  receiptUrl?: string | null
  unsubscribeUrl?: string | null
  appUrl?: string
}) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <Font fontFamily="Geist" fallbackFontFamily="Helvetica" fontWeight={400} fontStyle="normal" />
        <style>{s.darkModeCss}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={s.body} className="l-body">
        <Container style={s.container}>
          <Section style={{ margin: '0 0 24px' }}>
            <Text style={{ ...s.h2, margin: 0 }} className="l-text">
              Lumira
            </Text>
          </Section>
          {children}
          <Hr style={s.hr} />
          <Text style={s.footnote} className="l-muted">
            Payments, tax and invoicing are handled by Lemon Squeezy, our Merchant of Record.
            {receiptUrl ? (
              <>
                {' '}
                <Link href={receiptUrl} style={s.link} className="l-link">
                  View your receipt
                </Link>
                .
              </>
            ) : null}
          </Text>
          <Text style={s.footnote} className="l-muted">
            Questions? Reply to this email or write to{' '}
            <Link href="mailto:support@lumira.dev" style={s.link} className="l-link">
              support@lumira.dev
            </Link>
            .
          </Text>
          {unsubscribeUrl ? (
            <Text style={s.footnote} className="l-muted">
              <Link href={unsubscribeUrl} style={s.link} className="l-link">
                Unsubscribe from release emails
              </Link>{' '}
              ·{' '}
              <Link href={`${appUrl}/account/settings`} style={s.link} className="l-link">
                Email preferences
              </Link>
            </Text>
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}
