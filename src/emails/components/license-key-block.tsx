import { Section, Text } from '@react-email/components'
import { brandHex } from '@/lib/brand-hex'
import { fontMono } from '../theme'

/** License key in a Geist Mono block (SG §5.10). The value is decrypted at send time only. */
export function LicenseKeyBlock({ value }: { value: string }) {
  return (
    <Section
      className="l-key"
      style={{
        background: brandHex.light.mutedSurface,
        border: `1px solid ${brandHex.light.border}`,
        borderRadius: 12,
        padding: '16px 20px',
        margin: '0 0 16px',
      }}
    >
      <Text
        style={{
          margin: 0,
          fontSize: 12,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: brandHex.light.muted,
          fontFamily: fontMono,
        }}
      >
        License key
      </Text>
      <Text
        className="l-text"
        style={{
          margin: '6px 0 0',
          fontSize: 15,
          letterSpacing: '0.02em',
          color: brandHex.light.text,
          wordBreak: 'break-all',
          fontFamily: fontMono,
        }}
      >
        {value}
      </Text>
    </Section>
  )
}
