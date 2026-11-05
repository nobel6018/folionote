import { parsePageId } from 'notion-utils'

import type * as types from '../types.js'
import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'
import { isNoindexPage } from '../shared/page-meta.js'

/**
 * 사이트맵 XML. 부르는 쪽이 캐시와 폴백을 정한다.
 *
 * 주소는 두 곳에서 모은다.
 *
 * 1. `pageUrlOverrides` 전부. 사이트 주인이 공개 주소로 정해 둔 목록이라 크롤 결과와
 *    상관없이 넣는다. 크롤에만 기대면 시간 예산이나 429로 빠진 페이지가 사이트맵에서도
 *    사라진다. 실측(note.leedo.me): 지켜야 할 주소 207개 중 63개가 빠졌고, 그중에
 *    `/books`, `/devs` 같은 목록 페이지도 있었다.
 * 2. 크롤에서 찾은 나머지 페이지. 이미 1에서 넣은 페이지와 루트 페이지는 뺀다.
 *    루트는 제목 slug(`/이도李裪`)로도 잡혀서 홈이 두 번 올라갔다.
 *
 * 홈은 canonical과 같은 꼴(끝 슬래시 없음) 하나만 넣는다. 한글 경로는 퍼센트 인코딩한다.
 * 사이트맵 규격은 URL을 이스케이프된 형태로 요구한다.
 *
 * @see buildFallbackSitemapXml
 */
export function buildSitemapXml(
  config: ResolvedSiteConfig,
  siteMap: types.SiteMap
): string {
  const rootId = toId(config.rootNotionPageId)
  const paths = new Map<string, string>()

  for (const [path, pageId] of Object.entries(config.pageUrlOverrides)) {
    paths.set(path, pageId)
  }

  const overriddenIds = new Set(
    Object.values(config.pageUrlOverrides).map((id) => toId(id))
  )
  for (const [path, pageId] of Object.entries(siteMap.canonicalPageMap)) {
    const id = toId(pageId)
    if (id === rootId || overriddenIds.has(id) || paths.has(path)) {
      continue
    }
    paths.set(path, pageId)
  }

  const urls = [...paths]
    // noindex로 표시한 페이지는 사이트맵에서도 뺀다. 넣어두면 "빼달라고 하면서
    // 목록에는 올리는" 모순된 신호가 된다.
    .filter(([, pageId]) => !isNoindexPage(config, pageId))
    .map(([path]) => `${config.host}/${encodeURI(path)}`)

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[config.host, ...urls].map((loc) => `  <url><loc>${escapeXml(loc)}</loc></url>`).join('\n')}
</urlset>
`
}

function toId(id: string): string | undefined {
  return parsePageId(id, { uuid: false })
}

function escapeXml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/**
 * 크롤 없이 만드는 사이트맵. 크롤이 실패했거나 아직 끝나지 않았을 때, 그리고
 * `strictPaths` 사이트에서 쓴다.
 * `pageUrlOverrides`만으로도 사이트 주인이 정한 공개 주소는 전부 들어간다.
 * 예전에는 홈 하나만 담아서, 이 사이트맵을 받은 검색엔진은 하위 페이지를 몰랐다.
 */
export function buildFallbackSitemapXml(config: ResolvedSiteConfig): string {
  return buildSitemapXml(config, {
    site: config.site,
    pageMap: {},
    canonicalPageMap: {}
  } as unknown as types.SiteMap)
}

/**
 * robots.txt. 크롤 허용 여부는 배포 환경이 정하는 값이라 인자로 받는다
 * (자체 호스팅 앱은 `isProductionDeployment()`를 넘긴다).
 */
export function buildRobotsTxt(
  config: ResolvedSiteConfig,
  { allowCrawling }: { allowCrawling: boolean }
): string {
  if (allowCrawling) {
    return `User-agent: *
Allow: /
Disallow: /api/get-tweet-ast/*
Disallow: /api/search-notion

Sitemap: ${config.host}/sitemap.xml
`
  }

  return `User-agent: *
Disallow: /

Sitemap: ${config.host}/sitemap.xml
`
}
