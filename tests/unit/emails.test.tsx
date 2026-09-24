import { describe, expect, it } from 'vitest'
import { render } from '@react-email/components'
import OrderConfirmationEmail from '@/emails/order-confirmation'
import { AdminAlertEmail, LicenseKeyReadyEmail, PaymentFailedEmail, SupportRequestEmail } from '@/emails/simple-emails'

const APP = 'https://lumira.test'
const KEY = '38B1460A-5104-4067-A91D-77B872934D51'

// SG §5.10 / FR-EM-*: rendered HTML contracts. Structure, not pixels: the key is shown in full and
// selectable, links point at our domain, and nothing adds tracking pixels.
describe('transactional emails', () => {
  it('order confirmation carries the key, the download, the activation command and the receipt', async () => {
    const html = await render(
      <OrderConfirmationEmail
        firstName="Ada"
        orderNumber={1001}
        receiptUrl="https://app.lemonsqueezy.com/my-orders/abc"
        libraryUrl={`${APP}/auth/continue?ticket=t`}
        appUrl={APP}
        items={[
          {
            productName: 'Lumen UI',
            tier: 'Team',
            version: '2.1.0',
            sizeLabel: '48.2 MB',
            downloadUrl: `${APP}/d/token`,
            docsUrl: `${APP}/docs/lumen-ui`,
            licenseKey: KEY,
            activationCommand: 'npx lumira@latest activate',
          },
        ]}
      />,
    )
    expect(html).toContain(KEY)
    expect(html).toContain(`${APP}/d/token`)
    expect(html).toContain('npx lumira@latest activate')
    expect(html).toContain('https://app.lemonsqueezy.com/my-orders/abc')
    expect(html).toContain(`${APP}/auth/continue?ticket=t`)
    expect(html).toContain('Ada')
    expect(html).not.toMatch(/<img[^>]+(width="1"|height="1")/) // no tracking pixels
  })

  it('plain-text rendering keeps the key readable for clients without HTML', async () => {
    const text = await render(
      <LicenseKeyReadyEmail
        productName="Lumen UI"
        licenseKey={KEY}
        activationCommand={null}
        docsUrl={`${APP}/docs`}
        libraryUrl={`${APP}/account/licenses`}
        appUrl={APP}
      />,
      { plainText: true },
    )
    expect(text).toContain(KEY)
    expect(text).toContain('Open your Library')
  })

  it('dunning and admin emails render with their calls to action', async () => {
    const dunning = await render(
      <PaymentFailedEmail
        amount="$39.00"
        nextAttempt="Sep 28"
        updatePaymentUrl={`${APP}/account/billing/portal?to=payment`}
        appUrl={APP}
      />,
    )
    expect(dunning).toContain(`${APP}/account/billing/portal?to=payment`)
    const alert = await render(
      <AdminAlertEmail title="Job failed" lines={['job: 1']} url={`${APP}/admin`} appUrl={APP} />,
    )
    expect(alert).toContain('Job failed')
  })

  it('support requests escape buyer input', async () => {
    const html = await render(
      <SupportRequestEmail
        from="ada@example.test"
        message={'<script>alert(1)</script>\n\nThanks'}
        context={['User: user_a']}
        appUrl={APP}
      />,
    )
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
