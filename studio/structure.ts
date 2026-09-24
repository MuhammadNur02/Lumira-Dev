import type { StructureResolver } from 'sanity/structure'

const LINES = [
  { id: 'boilerplate', title: 'SaaS Boilerplates' },
  { id: 'ui_kit', title: 'UI Component Libraries' },
  { id: 'template', title: 'Website Templates' },
] as const

/** Desk structure (Task.md P2.10): singletons pinned, products grouped by line, releases per product. */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Lumira')
    .items([
      S.listItem().title('Home page').id('homePage').child(S.document().schemaType('homePage').documentId('homePage')),
      S.listItem()
        .title('Site settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.listItem()
        .title('Products')
        .child(
          S.list()
            .title('Products')
            .items([
              ...LINES.map((line) =>
                S.listItem()
                  .title(line.title)
                  .child(
                    S.documentTypeList('product')
                      .title(line.title)
                      .filter('_type == "product" && line == $line')
                      .params({ line: line.id }),
                  ),
              ),
              S.divider(),
              S.listItem().title('All products').child(S.documentTypeList('product')),
            ]),
        ),
      S.listItem()
        .title('Releases by product')
        .child(
          S.documentTypeList('product')
            .title('Pick a product')
            .child((productId) =>
              S.documentList()
                .title('Releases')
                .schemaType('release')
                .filter('_type == "release" && product._ref == $productId')
                .params({ productId })
                .defaultOrdering([{ field: 'releasedAt', direction: 'desc' }]),
            ),
        ),
      S.documentTypeListItem('release').title('All releases'),
      S.documentTypeListItem('bundle').title('Bundles'),
      S.divider(),
      S.documentTypeListItem('techStack').title('Tech stack'),
      S.documentTypeListItem('category').title('Categories'),
      S.documentTypeListItem('faq').title('FAQ'),
      S.documentTypeListItem('testimonial').title('Testimonials'),
      S.divider(),
      S.documentTypeListItem('post').title('Blog posts'),
      S.documentTypeListItem('author').title('Authors'),
      S.documentTypeListItem('legalPage').title('Legal pages'),
      S.documentTypeListItem('redirect').title('Redirects'),
    ])
