import type { GetServerSideProps } from 'next'
import { buildRobotsTxt, isProductionDeployment } from '@folionote/core/server'

import { loadSiteConfig } from '@/lib/load-site-config'

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const config = loadSiteConfig()

  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ error: 'method not allowed' }))
    res.end()

    return {
      props: {}
    }
  }

  // cache for up to one day
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
  res.setHeader('Content-Type', 'text/plain')

  // only allow the site to be crawlable on the production deployment
  res.write(buildRobotsTxt(config, { allowCrawling: isProductionDeployment() }))
  res.end()

  return {
    props: {}
  }
}

export default function noop() {
  return null
}
