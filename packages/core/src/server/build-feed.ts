import { type Block, type ExtendedRecordMap } from 'notion-types'
import {
  getBlockParentPage,
  getBlockTitle,
  getBlockValue,
  getPageProperty,
  idToUuid
} from 'notion-utils'
import RSS from 'rss'

import type * as types from '../types.js'
import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'
import { getSocialImageUrl } from '../shared/get-social-image-url.js'
import { getCanonicalPageUrl } from '../shared/map-page-url.js'

/** 피드 기본 TTL. 24시간 */
export const FEED_TTL_MINUTES = 24 * 60

/**
 * 사이트맵을 RSS XML로 만든다.
 *
 * 라우트가 아니라 문자열을 만드는 함수로 둔다. 자체 호스팅 앱은 `pages/feed.tsx`가,
 * 호스팅 서비스는 자기 핸들러가 같은 함수를 부른다. 응답 헤더와 캐시 정책은 부르는
 * 쪽이 정한다.
 */
export function buildFeedXml(
  config: ResolvedSiteConfig,
  siteMap: types.SiteMap,
  { ttlMinutes = FEED_TTL_MINUTES }: { ttlMinutes?: number } = {}
): string {
  const feed = new RSS({
    title: config.name,
    site_url: config.host,
    // 자기 자신을 가리키는 주소. 실제 라우트는 /feed/ 다 (trailingSlash: true).
    // /feed.xml로 적어놨는데 그건 rewrite로 넘어오는 별칭일 뿐이라, 리더가
    // 정규 주소로 기억하는 값은 실제 경로여야 한다.
    feed_url: `${config.host}/feed/`,
    language: config.language,
    ttl: ttlMinutes
  })

  for (const pagePath of Object.keys(siteMap.canonicalPageMap)) {
    const pageId = siteMap.canonicalPageMap[pagePath]!
    const recordMap = siteMap.pageMap[pageId] as ExtendedRecordMap
    if (!recordMap) continue

    // v7.10부터 record 값이 `Block | { role, value }` union이라 `.value`만 꺼내면
    // bare Block인 경우 undefined가 된다. 그 탓에 모든 페이지가 아래 `continue`에
    // 걸려서 RSS가 항목 0개로 나갔다. getBlockValue로 풀어야 한다.
    // keys[0]에 의존하지 않고 pageId로 직접 집는다.
    const block = getBlockValue(recordMap?.block?.[pageId]) as Block | undefined
    if (!block) continue

    const parentPage = getBlockParentPage(block, recordMap)
    const isBlogPost =
      block.type === 'page' &&
      block.parent_table === 'collection' &&
      parentPage?.id === idToUuid(config.rootNotionPageId)
    if (!isBlogPost) {
      continue
    }

    const title = getBlockTitle(block, recordMap) || config.name
    const description =
      getPageProperty<string>('Description', block, recordMap) ||
      config.description
    const url = getCanonicalPageUrl(config, recordMap)(pageId)
    const lastUpdatedTime = getPageProperty<number>(
      'Last Updated',
      block,
      recordMap
    )
    const publishedTime = getPageProperty<number>('Published', block, recordMap)
    const date = lastUpdatedTime
      ? new Date(lastUpdatedTime)
      : publishedTime
        ? new Date(publishedTime)
        : new Date()
    const socialImageUrl = getSocialImageUrl(config, pageId)

    feed.item({
      title,
      url,
      date,
      description,
      enclosure: socialImageUrl
        ? {
            url: socialImageUrl,
            type: 'image/jpeg'
          }
        : undefined
    })
  }

  return feed.xml({ indent: true })
}
