import crypto from 'node:crypto'

import { type NextApiRequest, type NextApiResponse } from 'next'
import { parsePageId } from 'notion-utils'

import { loadSiteConfig } from '@/lib/load-site-config'

/**
 * ISR 캐시를 기다리지 않고 지금 다시 만든다 (on-demand revalidation).
 *
 * 페이지는 600초 ISR이라 Notion에서 고쳐도 마지막 재생성에서 10분이 지난 뒤 첫 요청이
 * 와야 바뀐다. 문장 하나라면 기다리면 되지만, 파일 블록을 갈아 끼운 경우에는 그 사이
 * 옛 페이지가 지워진 블록을 가리켜 다운로드가 400으로 깨진다. 이 라우트로 고친 직후
 * 바로 다시 만든다.
 *
 * `REVALIDATE_SECRET`이 없으면 404다(fail-closed). 비밀은 쿼리스트링이 아니라
 * `Authorization` 헤더로만 받는다. 쿼리는 접근 로그에 그대로 남는다.
 *
 * @see docs/deployment.md
 */

/** 한 번에 다시 만들 주소 수 상한. 페이지마다 Notion을 읽으므로 많으면 429가 난다 */
const MAX_PATHS = 10

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

  if (!isAuthorized(req.headers.authorization, secret)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const paths = collectPaths(req.body)

  if (paths === null) {
    return res.status(400).json({
      error:
        'body는 { "paths": ["/about"] } 또는 { "pageId": "<Notion 페이지 ID>" } 꼴이어야 합니다'
    })
  }

  if (paths.length > MAX_PATHS) {
    return res
      .status(400)
      .json({ error: `한 번에 ${MAX_PATHS}개까지 다시 만들 수 있습니다` })
  }

  const revalidated: string[] = []
  const failed: Array<{ path: string; error: string }> = []

  // 순서대로 돈다. 동시에 돌리면 Notion 429로 전부 실패하기 쉽다
  for (const path of paths) {
    try {
      await res.revalidate(path)
      revalidated.push(path)
    } catch (err) {
      failed.push({ path, error: (err as Error).message })
    }
  }

  // 실패한 주소는 getStaticProps가 던진 것이라 옛 캐시가 그대로 남아 있다
  return res.status(failed.length > 0 ? 502 : 200).json({ revalidated, failed })
}

function isAuthorized(header: string | undefined, expected: string): boolean {
  const token = header?.startsWith('Bearer ') ? header.slice(7) : ''

  // 길이가 다르면 timingSafeEqual이 던지므로 해시로 길이를 맞춘다
  const a = crypto.createHash('sha256').update(token).digest()
  const b = crypto.createHash('sha256').update(expected).digest()

  return crypto.timingSafeEqual(a, b)
}

/**
 * 다시 만들 주소를 모은다. 형식이 틀리면 null.
 *
 * `pageId`를 주면 그 페이지가 사이트에서 열리는 주소를 전부 고른다. 같은 페이지가
 * pretty URL(`/about`)과 ID 주소(`/<32자 ID>`) 두 곳에 캐시되기 때문이다. 루트
 * 페이지면 `/`도 넣는다.
 */
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
    const id = parsePageId(pageId, { uuid: false })

    if (!id) {
      return null
    }

    const config = loadSiteConfig()
    const result = [`/${id}`]
    const prettyPath = config.inversePageUrlOverrides[id]

    if (prettyPath) {
      result.push(`/${prettyPath}`)
    }

    if (id === config.rootNotionPageId) {
      result.push('/')
    }

    return result
  }

  return null
}

/** 사이트 안의 경로만 받는다. 다른 호스트나 쿼리가 섞이면 revalidate가 엉뚱한 키를 만든다 */
function isSitePath(path: string): boolean {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    path.length <= 512 &&
    !/[?#\s]/.test(path)
  )
}
