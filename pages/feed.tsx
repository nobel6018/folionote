import type { GetServerSideProps } from 'next'
import {
  buildFeedXml,
  FEED_TTL_MINUTES,
  getSiteMap
} from '@folionote/core/server'

import { loadSiteConfig } from '@/lib/load-site-config'

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const config = loadSiteConfig()

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ error: 'method not allowed' }))
    res.end()
    return { props: {} }
  }

  const siteMap = await getSiteMap(config)
  const ttlSeconds = FEED_TTL_MINUTES * 60

  res.setHeader(
    'Cache-Control',
    `public, max-age=${ttlSeconds}, stale-while-revalidate=${ttlSeconds}`
  )
  res.setHeader('Content-Type', 'text/xml; charset=utf-8')
  res.write(buildFeedXml(config, siteMap))
  res.end()

  return { props: {} }
}

export default function noop() {
  return null
}
