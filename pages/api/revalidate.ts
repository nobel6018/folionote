import { type NextApiRequest, type NextApiResponse } from 'next'

import { loadSiteConfig } from '@/lib/load-site-config'
import {
  getPagePaths,
  isBearerAuthorized,
  isSitePath,
  MAX_REVALIDATE_PATHS,
  revalidatePaths
} from '@/lib/revalidate'

/**
 * ISR 캐시를 기다리지 않고 지금 다시 만든다 (on-demand revalidation).
 *
 * 페이지는 600초 ISR이라 Notion에서 고쳐도 마지막 재생성에서 10분이 지난 뒤 첫 요청이
 * 와야 바뀐다. 문장 하나라면 기다리면 되지만, 파일 블록을 갈아 끼운 경우에는 그 사이
 * 옛 페이지가 지워진 블록을 가리켜 다운로드가 400으로 깨진다. 이 라우트로 고친 직후
 * 바로 다시 만든다. MCP의 `revalidate` 도구도 같은 일을 한다(`lib/revalidate.ts`).
 *
 * `REVALIDATE_SECRET`이 없으면 404다(fail-closed).
 *
 * @see docs/deployment.md
 */

const secret = process.env.REVALIDATE_SECRET || undefined

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store')

  if (!secret) {
    return res.status(404).json({ error: 'not found' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  if (!isBearerAuthorized(req.headers.authorization, secret)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const paths = collectPaths(req.body)

  if (paths === null) {
    return res.status(400).json({
      error:
        'body는 { "paths": ["/about"] } 또는 { "pageId": "<Notion 페이지 ID>" } 꼴이어야 합니다'
    })
  }

  if (paths.length > MAX_REVALIDATE_PATHS) {
    return res.status(400).json({
      error: `한 번에 ${MAX_REVALIDATE_PATHS}개까지 다시 만들 수 있습니다`
    })
  }

  const result = await revalidatePaths(res, paths)

  return res.status(result.failed.length > 0 ? 502 : 200).json(result)
}

/** 다시 만들 주소를 모은다. 형식이 틀리면 null */
function collectPaths(body: unknown): string[] | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const { paths, pageId } = body as { paths?: unknown; pageId?: unknown }

  if (paths !== undefined) {
    if (!Array.isArray(paths) || paths.length === 0) {
      return null
    }

    if (!paths.every((p) => typeof p === 'string' && isSitePath(p))) {
      return null
    }

    return [...new Set(paths as string[])]
  }

  if (typeof pageId === 'string') {
    return getPagePaths(loadSiteConfig(), pageId)
  }

  return null
}
