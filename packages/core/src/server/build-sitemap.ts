import type * as types from '../types.js'
import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'
import { isNoindexPage } from '../shared/page-meta.js'

/**
 * 사이트맵 XML. 부르는 쪽이 캐시와 폴백을 정한다.
 *
 * @see buildFallbackSitemapXml
 */
export function buildSitemapXml(
  config: ResolvedSiteConfig,
  siteMap: types.SiteMap
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${config.host}</loc>
    </url>

    <url>
      <loc>${config.host}/</loc>
    </url>

    ${Object.keys(siteMap.canonicalPageMap)
      // noindex로 표시한 페이지는 사이트맵에서도 뺀다. 넣어두면 "빼달라고 하면서
      // 목록에는 올리는" 모순된 신호가 된다.
      .filter(
        (canonicalPagePath) =>
          !isNoindexPage(config, siteMap.canonicalPageMap[canonicalPagePath])
      )
      .map((canonicalPagePath) =>
        `
          <url>
            <loc>${config.host}/${canonicalPagePath}</loc>
          </url>
        `.trim()
      )
      .join('')}
  </urlset>
`
}

/**
 * 크롤이 실패했을 때 내보내는 최소 사이트맵. 500 대신 유효한 XML을 주면 검색엔진이
 * 루트만이라도 가져간다.
 */
export function buildFallbackSitemapXml(config: ResolvedSiteConfig): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${config.host}</loc></url>
  <url><loc>${config.host}/</loc></url>
</urlset>
`
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
