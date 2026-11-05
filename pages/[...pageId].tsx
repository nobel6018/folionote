import { type ParsedUrlQuery } from 'node:querystring'

import { NotionPage } from '@folionote/core'
import { type PageProps } from '@folionote/core/config'
import { resolveNotionPage } from '@folionote/core/server'
import { type GetStaticProps } from 'next'

import { loadSiteConfig } from '@/lib/load-site-config'

/**
 * catch-all 라우트다. pretty URL이 `/books/1`처럼 여러 단계일 수 있어서다.
 * 다른 서비스에서 옮겨 올 때 기존 주소를 그대로 지켜야 검색 순위가 유지되는데,
 * 그 서비스들은 `/카테고리/번호` 꼴 주소를 흔히 쓴다. 한 단계짜리 주소와 Notion ID
 * 주소도 그대로 여기로 들어온다.
 */
interface CatchAllParams extends ParsedUrlQuery {
  pageId: string[]
}

export const getStaticProps: GetStaticProps<PageProps, CatchAllParams> = async (
  context
) => {
  // pageUrlOverrides의 키와 같은 꼴(앞 슬래시 없이 `books/1`)로 맞춘다
  const rawPageId = (context.params?.pageId ?? []).join('/')
  const config = loadSiteConfig()

  try {
    const props = await resolveNotionPage(config, rawPageId)

    // 없는 주소와 비공개 하위 페이지는 진짜 404로 돌려준다. 안내 화면을 props로
    // 그리면 상태 코드가 200이라, 검색엔진이 오류 화면을 정상 페이지로 색인한다
    // (soft 404). 화면은 pages/404.tsx가 그린다. 루트 페이지(pages/index.tsx)는
    // 셋업 중 "Notion 미공개" 안내가 필요해서 그대로 둔다.
    if (props.error?.statusCode === 404) {
      return { notFound: true, revalidate: 30 }
    }

    return {
      props,
      // ISR: 10분마다 backend 재검증. 빌드 시 152개 페이지 동시 SSG → Notion API 429
      // 회피용. 첫 요청 때 server-side fetch + 캐시.
      // 안내 화면(Notion 미공개 등)은 30초. (@see lib/resolve-notion-page.ts)
      revalidate: props.error ? 30 : 600
    }
  } catch (err) {
    console.error('page error', config.domain, rawPageId, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export async function getStaticPaths() {
  // pretty URL로 노출한 페이지만 빌드 시 미리 만든다. 기본은 pageUrlOverrides
  // 전부이고, 매핑이 많으면 site.config.ts의 prebuildPaths로 줄인다.
  //
  // 이 페이지들은 보통 컬렉션(데이터베이스)이고, 렌더할 때 카드 커버마다 LQIP
  // 프리뷰를 만들기 때문에 한 장에 90초가 넘게 걸린다. fallback으로 요청 중에
  // 만들면 서버리스 함수 제한 시간을 넘겨 500이 난다.
  //
  // 나머지(글 상세)는 한 장씩이라 싸므로 계속 lazy SSG + ISR로 둔다.
  // 전체를 미리 만들면 수백 페이지를 동시에 요청해 Notion API 429를 맞는다.
  return {
    paths: loadSiteConfig().prebuildPaths.map((uri) => ({
      params: { pageId: uri.split('/') }
    })),
    fallback: 'blocking'
  }
}

export default function NotionDomainDynamicPage(props: PageProps) {
  return <NotionPage {...props} />
}
