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
  // 사이트 전체 noindex를 켜 두면 프로덕션이어도 막는다 (새 도메인 미리 띄워 보기)
  res.write(
    buildRobotsTxt(config, {
      allowCrawling: isProductionDeployment() && !config.noindex
    })
  )
  res.end()

  return {
    props: {}
  }
}

export default function noop() {
  return null
}
