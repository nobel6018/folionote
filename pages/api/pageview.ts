import { type NextApiRequest, type NextApiResponse } from 'next'
import { parsePageId } from 'notion-utils'

import { loadSiteConfig } from '@/lib/load-site-config'
import {
  incrementPageView,
  isPageViewCountAvailable,
  readPageView
} from '@/lib/pageview-store'

/**
 * 페이지뷰 카운터 (레퍼런스 서비스 어드민의 "페이지뷰 카운트").
 *
 * POST면 1 올리고, GET이면 읽기만 한다. 페이지가 정적으로 미리 만들어지므로
 * 카운트는 클라이언트에서 이 라우트를 불러 채운다.
 *
 * Redis가 없으면 501을 준다. 클라이언트는 그때 아무것도 그리지 않는다
 * (@see lib/pageview-store.ts).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const config = loadSiteConfig()

  if (!isPageViewCountAvailable(config)) {
    return res.status(501).json({ error: 'pageview count is not configured' })
  }

  // 임의 문자열로 키를 만들지 못하게 Notion 페이지 ID 형식만 받는다
  const pageId = parsePageId(
    Array.isArray(req.query.pageId) ? req.query.pageId[0] : req.query.pageId,
    { uuid: false }
  )

  if (!pageId) {
    return res.status(400).json({ error: 'invalid pageId' })
  }

  const counts =
    req.method === 'POST'
      ? await incrementPageView(config, pageId)
      : await readPageView(config, pageId)

  if (!counts) {
    return res.status(503).json({ error: 'pageview store unavailable' })
  }

  // 카운트는 매번 달라진다. 캐시되면 숫자가 굳는다
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json(counts)
}
