import { type GetStaticProps } from 'next'

import { NotionPage } from '@/components/NotionPage'
import { domain, pageUrlOverrides } from '@/lib/config'
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
  // pretty URL로 노출한 페이지만 빌드 시 미리 만든다.
  //
  // 이 페이지들은 보통 컬렉션(데이터베이스)이고, 렌더할 때 카드 커버마다 LQIP
  // 프리뷰를 만들기 때문에 한 장에 90초가 넘게 걸린다. fallback으로 요청 중에
  // 만들면 서버리스 함수 제한 시간을 넘겨 500이 난다.
  //
  // 나머지(글 상세)는 한 장씩이라 싸므로 계속 lazy SSG + ISR로 둔다.
  // 전체를 미리 만들면 수백 페이지를 동시에 요청해 Notion API 429를 맞는다.
  return {
    paths: Object.keys(pageUrlOverrides).map((uri) => ({
      params: { pageId: uri.replace(/^\//, '') }
    })),
    fallback: 'blocking'
  }
}

export default function NotionDomainDynamicPage(props: PageProps) {
  return <NotionPage {...props} />
}
