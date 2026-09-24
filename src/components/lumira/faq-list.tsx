import type { Faq } from '@/lib/sanity/models'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { JsonLd } from './json-ld'
import { PortableText, toPlainText } from './portable-text'

/** FAQ accordion (SG §5.3) with FAQPage structured data (FR-SF-10). */
export function FaqList({ items, structuredData = true }: { items: Faq[]; structuredData?: boolean }) {
  if (!items.length) return null
  return (
    <>
      <Accordion type="single" collapsible className="border-t border-border">
        {items.map((f) => (
          <AccordionItem key={f._id} value={f._id}>
            <AccordionTrigger>{f.question}</AccordionTrigger>
            <AccordionContent>
              <PortableText value={f.answer} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {structuredData ? (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: items.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: toPlainText(f.answer) },
            })),
          }}
        />
      ) : null}
    </>
  )
}
