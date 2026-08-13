import type { GetServerSideProps } from 'next'

import type { SiteMap } from '@/lib/types'
import { host } from '@/lib/config'
import { getSiteMap } from '@/lib/get-site-map'
import { isNoindexPage } from '@/lib/page-meta'

// In-memory cache. Vercel serverless instance가 살아 있는 동안 재사용 (warm start).
// CDN cache(Cache-Control 8h) + memory cache + fallback의 3-tier 방어.
let cachedXml: string | null = null
let cachedAt = 0
const CACHE_TTL_MS = 8 * 60 * 60 * 1000 // 8h

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ error: 'method not allowed' }))
    res.end()
    return {
      props: {}
    }
  }

  // CDN cache header (Vercel edge가 8h 캐시).
  res.setHeader(
    'Cache-Control',
    'public, max-age=28800, stale-while-revalidate=28800'
  )
  res.setHeader('Content-Type', 'text/xml')

  // 1) memory cache hit
  if (cachedXml && Date.now() - cachedAt < CACHE_TTL_MS) {
    res.write(cachedXml)
    res.end()
    return { props: {} }
  }

  // 2) fresh fetch
  try {
    const siteMap = await getSiteMap()
    cachedXml = createSitemap(siteMap)
    cachedAt = Date.now()
    res.write(cachedXml)
  } catch (err) {
    // getSiteMap이 Notion API rate limit 등으로 실패하면 minimal sitemap fallback.
    // 500 대신 valid XML 응답해서 search engine에 root만이라도 노출. cache는 안 함
    // (다음 요청에 다시 시도해서 full sitemap 만들 기회 줌).
    console.error('sitemap error', err)
    res.write(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${host}</loc></url>
  <url><loc>${host}/</loc></url>
</urlset>
`)
  }

  res.end()

  return {
    props: {}
  }
}

const createSitemap = (siteMap: SiteMap) =>
  `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${host}</loc>
    </url>

    <url>
      <loc>${host}/</loc>
    </url>

    ${Object.keys(siteMap.canonicalPageMap)
      // noindex로 표시한 페이지는 사이트맵에서도 뺀다. 넣어두면 "빼달라고 하면서
      // 목록에는 올리는" 모순된 신호가 된다.
      .filter(
        (canonicalPagePath) =>
          !isNoindexPage(siteMap.canonicalPageMap[canonicalPagePath])
      )
      .map((canonicalPagePath) =>
        `
          <url>
            <loc>${host}/${canonicalPagePath}</loc>
          </url>
        `.trim()
      )
      .join('')}
  </urlset>
`

export default function noop() {
  return null
}
