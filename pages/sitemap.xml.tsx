import type { GetServerSideProps } from 'next'

import type { SiteMap } from '@/lib/types'
import { host } from '@/lib/config'
import { getSiteMap } from '@/lib/get-site-map'

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

  // cache for up to 8 hours
  res.setHeader(
    'Cache-Control',
    'public, max-age=28800, stale-while-revalidate=28800'
  )
  res.setHeader('Content-Type', 'text/xml')

  try {
    const siteMap = await getSiteMap()
    res.write(createSitemap(siteMap))
  } catch (err) {
    // getSiteMap이 Notion API rate limit 등으로 실패하면 minimal sitemap fallback.
    // 500 대신 valid XML 응답해서 search engine에 root만이라도 노출.
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
