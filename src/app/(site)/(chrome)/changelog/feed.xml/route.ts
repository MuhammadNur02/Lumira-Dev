import { env } from '@/lib/env'
import { atomFeed } from '@/lib/feed'
import { getChangelog } from '@/lib/sanity/fetchers'

export async function GET() {
  return atomFeed({
    site: env.NEXT_PUBLIC_APP_URL,
    title: 'Lumira Changelog',
    selfPath: '/changelog/feed.xml',
    htmlPath: '/changelog',
    releases: await getChangelog(), // cached, tag 'changelog'
  })
}
