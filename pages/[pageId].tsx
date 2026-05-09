import { type GetStaticProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { resolveNotionPage } from '@/lib/resolve-notion-page'
import { type PageProps, type Params } from '@/lib/types'

export const getStaticProps: GetStaticProps<PageProps, Params> = async (
  context
) => {
  const rawPageId = context.params?.pageId as string

  try {
    const props = await resolveNotionPage(domain, rawPageId)

    return {
      props,
      // ISR: 10분마다 backend 재검증. 빌드 시 152개 페이지 동시 SSG → Notion API 429
      // 회피용. 첫 요청 때 server-side fetch + 캐시.
      revalidate: 600
    }
  } catch (err) {
    console.error('page error', domain, rawPageId, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export async function getStaticPaths() {
  // dev/production 모두 paths 미리 안 만들고 fallback:'blocking'으로 lazy SSG.
  // 첫 요청 때 server-side fetch + ISR 캐시. Notion API rate limit 안 침.
  return {
    paths: [],
    fallback: 'blocking'
  }
}

export default function NotionDomainDynamicPage(props: PageProps) {
  return <NotionPage {...props} />
}
