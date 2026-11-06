import type { GetServerSideProps } from 'next'
import {
  buildFallbackSitemapXml,
  buildSitemapXml,
  getSiteMap
} from '@folionote/core/server'
import { waitUntil } from '@vercel/functions'

import { loadSiteConfig } from '@/lib/load-site-config'

// In-memory cache. Vercel serverless instance가 살아 있는 동안 재사용 (warm start).
// CDN cache(Cache-Control 8h) + memory cache + fallback의 3-tier 방어.
let cachedXml: string | null = null
let cachedAt = 0
const CACHE_TTL_MS = 8 * 60 * 60 * 1000 // 8h

/**
 * 크롤을 기다리는 최대 시간. 캐시가 빈 첫 요청은 사이트 전체를 Notion에서 읽느라
 * 오래 걸린다(note.leedo.me 207페이지 실측 93초). 검색엔진은 그동안 기다려 주지 않으므로,
 * 이 시간이 지나면 pageUrlOverrides로 만든 사이트맵을 먼저 주고 크롤은 응답 뒤에
 * 마저 돌려 메모리 캐시를 채운다.
 */
const CRAWL_WAIT_MS = 8000

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const config = loadSiteConfig()

  // HEAD도 받는다. 사이트맵 검사 도구 중에 HEAD로 먼저 확인하는 것이 있는데, 405를
  // 주면 사이트맵이 없거나 깨졌다고 판단한다.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
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

  // 엄격 모드는 pageUrlOverrides가 공개 주소의 전부라 크롤할 이유가 없다
  if (config.strictPaths) {
    res.write(buildFallbackSitemapXml(config))
    res.end()
    return { props: {} }
  }

  // 2) fresh fetch. getSiteMap은 메모이즈돼 있어 같은 인스턴스에서 겹친 요청은
  //    크롤 하나를 함께 기다린다.
  const crawl = getSiteMap(config).then((siteMap) => {
    cachedXml = buildSitemapXml(config, siteMap)
    cachedAt = Date.now()
    return cachedXml
  })

  try {
    const xml = await Promise.race([
      crawl,
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), CRAWL_WAIT_MS)
      )
    ])

    if (xml) {
      res.write(xml)
    } else {
      // 크롤이 아직 안 끝났다. 응답이 끝나도 함수가 크롤을 마치도록 붙잡아 둔다.
      // 예비 사이트맵은 CDN에 오래 남지 않게 짧게 캐시한다.
      waitUntil(crawl.catch((err) => console.error('sitemap crawl error', err)))
      res.setHeader('Cache-Control', 'public, max-age=300')
      res.write(buildFallbackSitemapXml(config))
    }
  } catch (err) {
    // getSiteMap이 Notion API rate limit 등으로 실패하면 예비 사이트맵을 준다.
    // 500 대신 유효한 XML이라 검색엔진이 pageUrlOverrides의 주소는 가져간다.
    // 캐시는 안 함 (다음 요청에 다시 시도해서 전체 사이트맵을 만들 기회를 준다).
    console.error('sitemap error', err)
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.write(buildFallbackSitemapXml(config))
  }

  res.end()

  return {
    props: {}
  }
}

export default function noop() {
  return null
}
