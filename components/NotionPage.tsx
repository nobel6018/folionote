import cs from 'classnames'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { type PageBlock } from 'notion-types'
import {
  formatDate,
  getBlockTitle,
  getBlockValue,
  getPageProperty
} from 'notion-utils'
import * as React from 'react'
import BodyClassName from 'react-body-classname'
import {
  type NotionComponents,
  NotionRenderer,
  useNotionContext
} from 'react-notion-x'
import { EmbeddedTweet, TweetNotFound, TweetSkeleton } from 'react-tweet'
import { useSearchParam } from 'react-use'

import type * as types from '@/lib/types'
import * as config from '@/lib/config'
import { formatNotionDate } from '@/lib/format-date'
import { mapImageUrl } from '@/lib/map-image-url'
import { getCanonicalPageUrl, mapPageUrl } from '@/lib/map-page-url'
import { getPageMetaOverride } from '@/lib/page-meta'
import { searchNotion } from '@/lib/search-notion'
import { useDarkMode } from '@/lib/use-dark-mode'

import { Footer } from './Footer'
import { Loading } from './Loading'
import { NotionPageHeader } from './NotionPageHeader'
import { BottomNavigation } from './folio/BottomNavigation'
import { Code as FolioCode } from './folio/Code'
import { CtaButton } from './folio/CtaButton'
import { PageViewCount } from './folio/PageViewCount'
import { Popups } from './folio/Popups'
import { ScrollWidgets } from './folio/ScrollWidgets'
import { Page404 } from './Page404'
import { PageAside } from './PageAside'
import { PageHead } from './PageHead'
import styles from './styles.module.css'

// -----------------------------------------------------------------------------
// dynamic imports for optional components
// -----------------------------------------------------------------------------

// Prism syntax 등록은 _app.tsx에서 정적 import로 처리.
// react-notion-x default Code는 사용 안 함 (FolioCode로 교체).

// 컬렉션 제목 색상을 살리기 위해 레퍼런스 서비스 래퍼를 사용 (@see components/folio/Collection.tsx)
const Collection = dynamic(() =>
  import('./folio/Collection').then((m) => m.Collection)
)
const Equation = dynamic(() =>
  import('react-notion-x/build/third-party/equation').then((m) => m.Equation)
)
const Pdf = dynamic(
  () => import('react-notion-x/build/third-party/pdf').then((m) => m.Pdf),
  {
    ssr: false
  }
)
const Modal = dynamic(
  () =>
    import('react-notion-x/build/third-party/modal').then((m) => {
      m.Modal.setAppElement('.notion-viewport')
      return m.Modal
    }),
  {
    ssr: false
  }
)

function Tweet({ id }: { id: string }) {
  const { recordMap } = useNotionContext()
  const tweet = (recordMap as types.ExtendedTweetRecordMap)?.tweets?.[id]

  return (
    <React.Suspense fallback={<TweetSkeleton />}>
      {tweet ? <EmbeddedTweet tweet={tweet} /> : <TweetNotFound />}
    </React.Suspense>
  )
}

const propertyLastEditedTimeValue = (
  { block, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && block?.last_edited_time) {
    return `Last updated ${formatDate(block?.last_edited_time, {
      month: 'long'
    })}`
  }

  return defaultFn()
}

const propertyDateValue = (
  { data }: any,
  defaultFn: () => React.ReactNode
) => {
  // react-notion-x 기본 렌더는 영문 로케일 고정이라 한국어 사이트에서 어긋난다.
  // site.config.ts의 dateFormat을 따르도록 통일한다. (@see lib/format-date.ts)
  const startDate = data?.[0]?.[1]?.[0]?.[1]?.start_date

  if (startDate) {
    return formatNotionDate(startDate)
  }

  return defaultFn()
}

const propertyTextValue = (
  { schema, pageHeader }: any,
  defaultFn: () => React.ReactNode
) => {
  if (pageHeader && schema?.name?.toLowerCase() === 'author') {
    return <b>{defaultFn()}</b>
  }

  return defaultFn()
}

export function NotionPage({
  site,
  recordMap,
  error,
  pageId
}: types.PageProps) {
  const router = useRouter()
  const lite = useSearchParam('lite')

  const components = React.useMemo<Partial<NotionComponents>>(
    () => ({
      // next/legacy/image는 200px rootMargin IntersectionObserver로 지연 로딩해서
      // 스크롤을 조금만 빨리 내려도 카드가 블러인 채로 남는다. 최신 next/image는
      // 브라우저 네이티브 lazy를 쓰고, 네이티브는 회선 속도에 맞춰 훨씬 미리 받는다.
      nextImage: Image,
      nextLink: Link,
      // 코드 블록만 자체 컴포넌트로 교체. 나머지는 react-notion-x default.
      //
      // Callout은 일부러 교체하지 않는다. react-notion-x가 커스텀 Callout에는
      // children을 넘기지 않아서(기본 경로만 자식을 그린다) 자체 컴포넌트로는
      // 콜아웃 안의 블록이 통째로 사라진다. 모양은 CSS로 맞춘다.
      Code: FolioCode,
      Collection,
      Equation,
      Pdf,
      Modal,
      Tweet,
      Header: NotionPageHeader,
      propertyLastEditedTimeValue,
      propertyTextValue,
      propertyDateValue
    }),
    []
  )

  // lite mode is for oembed
  const isLiteMode = lite === 'true'

  const { isDarkMode } = useDarkMode()

  const siteMapPageUrl = React.useMemo(() => {
    const params: any = {}
    if (lite) params.lite = lite

    const searchParams = new URLSearchParams(params)
    return site ? mapPageUrl(site, recordMap!, searchParams) : undefined
  }, [site, recordMap, lite])

  const keys = Object.keys(recordMap?.block || {})
  // react-notion-x v7.10에서 record value 타입이 union으로 확장됨
  // (Block | { role, value }). root block은 항상 PageBlock이므로 cast.
  // getBlockValue로 풀어야 한다. v7.10부터 record 값이 `Block | { role, value }`
  // union이라 `.value`만 꺼내면 `{ role, value }`가 그대로 잡히고, Block이 아닌
  // 객체가 되면서 getBlockTitle/타입 검사가 조용히 실패한다. 그 결과 모든 페이지의
  // <title>과 og:title이 사이트 이름으로 폴백하고 있었다.
  const block = getBlockValue(recordMap?.block?.[keys[0]!]) as
    | PageBlock
    | undefined

  const isBlogPost =
    block?.type === 'page' && block?.parent_table === 'collection'

  // 목차는 기본으로 끈다. 레퍼런스 서비스는 글 옆에 목차를 띄우지 않는다.
  // (블록 union 버그 때문에 그동안은 isBlogPost가 항상 false여서 우연히 꺼져 있었다.)
  const showTableOfContents = config.isTableOfContentsEnabled && !!isBlogPost
  const minTableOfContentsItems = 3

  const pageAside = React.useMemo(
    () => (
      <PageAside
        block={block!}
        recordMap={recordMap!}
        isBlogPost={isBlogPost}
      />
    ),
    [block, recordMap, isBlogPost]
  )

  const footer = React.useMemo(
    () => (
      <>
        <PageViewCount pageId={pageId} />
        <Footer />
      </>
    ),
    [pageId]
  )

  if (router.isFallback) {
    return <Loading />
  }

  if (error || !site || !block || !recordMap) {
    return <Page404 site={site} pageId={pageId} error={error} />
  }

  // 페이지별 SEO 덮어쓰기. 지정한 값이 Notion 속성과 사이트 기본값을 모두 이긴다.
  // (@see lib/page-meta.ts)
  const metaOverride = getPageMetaOverride(pageId)

  const title =
    metaOverride?.title || getBlockTitle(block, recordMap) || site.name

  console.log('notion page', {
    isDev: config.isDev,
    title,
    pageId,
    rootNotionPageId: site.rootNotionPageId,
    recordMap
  })

  if (!config.isServer) {
    // add important objects to the window global for easy debugging
    const g = window as any
    g.pageId = pageId
    g.recordMap = recordMap
    g.block = block
  }

  const canonicalPageUrl = config.isDev
    ? undefined
    : getCanonicalPageUrl(site, recordMap)(pageId)

  const socialImage =
    metaOverride?.ogImage ||
    mapImageUrl(
      getPageProperty<string>('Social Image', block, recordMap) ||
        (block as PageBlock).format?.page_cover ||
        config.defaultPageCover,
      block
    )

  const socialDescription =
    metaOverride?.description ||
    getPageProperty<string>('Description', block, recordMap) ||
    config.description

  return (
    <>
      <PageHead
        pageId={pageId}
        site={site}
        title={title}
        description={socialDescription}
        image={socialImage}
        url={canonicalPageUrl}
        isBlogPost={isBlogPost}
        noindex={metaOverride?.noindex}
      />

      {/* lite 모드(oembed 임베드)에서는 위젯이 방해만 되므로 뺀다 */}
      {!isLiteMode && (
        <>
          <ScrollWidgets />
          <CtaButton />
          <Popups />
          <BottomNavigation />
        </>
      )}

      {isLiteMode && <BodyClassName className='notion-lite' />}

      {/* 하단 탭바가 있으면 본문/위젯 하단 여백을 확보한다 (@see folio-overrides.css) */}
      {!isLiteMode && config.bottomNavigation && (
        <BodyClassName className='folio-bottom-nav-offset' />
      )}
      {/* dark-mode body class는 next-themes(ThemeProvider)가 html element에 부여 */}

      <NotionRenderer
        bodyClassName={cs(
          styles.notion,
          pageId === site.rootNotionPageId && 'index-page'
        )}
        darkMode={isDarkMode}
        components={components}
        recordMap={recordMap}
        rootPageId={site.rootNotionPageId}
        rootDomain={site.domain}
        fullPage={!isLiteMode}
        previewImages={!!recordMap.preview_images}
        showCollectionViewDropdown={config.isCollectionViewTabsEnabled}
        showTableOfContents={showTableOfContents}
        minTableOfContentsItems={minTableOfContentsItems}
        defaultPageIcon={config.defaultPageIcon}
        defaultPageCover={config.defaultPageCover}
        defaultPageCoverPosition={config.defaultPageCoverPosition}
        mapPageUrl={siteMapPageUrl}
        mapImageUrl={mapImageUrl}
        searchNotion={config.isSearchEnabled ? searchNotion : undefined}
        // 목차를 끄면 aside 자체를 넘기지 않는다. 넘기면 내용이 비어도 362px짜리
        // 컨테이너가 렌더돼 본문을 밀어내고 넓은 화면에서 가로 스크롤을 만든다.
        // 레퍼런스 서비스에도 aside가 없다.
        pageAside={showTableOfContents ? pageAside : null}
        footer={footer}
      />
    </>
  )
}
