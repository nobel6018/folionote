import crypto from 'node:crypto'

import { type ResolvedSiteConfig } from '@folionote/core/config'
import { type NextApiResponse } from 'next'
import { parsePageId } from 'notion-utils'

/**
 * 즉시 갱신(on-demand revalidation)과 그 인증을 `/api/revalidate`와 `/api/mcp`가
 * 같이 쓴다.
 *
 * @see docs/deployment.md
 */

/** `/api/revalidate`가 켜져 있는지. MCP는 이 비밀 없이도 자기 인증으로 revalidate를 쓴다 */
export function isRevalidateApiEnabled(): boolean {
  return Boolean(process.env.REVALIDATE_SECRET)
}

/** 한 번에 다시 만들 주소 수 상한. 페이지마다 Notion을 읽으므로 많으면 429가 난다 */
export const MAX_REVALIDATE_PATHS = 10

/**
 * `Authorization: Bearer <비밀>`이 맞는지. 비밀이 비어 있으면 늘 거짓이다.
 *
 * 비밀은 쿼리스트링으로 받지 않는다. 쿼리는 접근 로그에 그대로 남는다.
 */
export function isBearerAuthorized(
  header: string | undefined,
  expected: string | undefined
): boolean {
  if (!expected) {
    return false
  }

  const token = header?.startsWith('Bearer ') ? header.slice(7) : ''

  // 길이가 다르면 timingSafeEqual이 던지므로 해시로 길이를 맞춘다
  const a = crypto.createHash('sha256').update(token).digest()
  const b = crypto.createHash('sha256').update(expected).digest()

  return crypto.timingSafeEqual(a, b)
}

/** 사이트 안의 경로만 받는다. 다른 호스트나 쿼리가 섞이면 revalidate가 엉뚱한 키를 만든다 */
export function isSitePath(path: string): boolean {
  return (
    path.startsWith('/') &&
    !path.startsWith('//') &&
    path.length <= 512 &&
    !/[?#\s]/.test(path)
  )
}

/**
 * Notion 페이지 하나가 사이트에서 열리는 주소를 전부 고른다. ID 형식이 아니면 null.
 *
 * 같은 페이지가 pretty URL(`/about`)과 ID 주소(`/<32자 ID>`) 두 곳에 따로 캐시된다.
 * 루트 페이지면 `/`도 넣는다.
 */
export function getPagePaths(
  config: ResolvedSiteConfig,
  pageIdOrUrl: string
): string[] | null {
  const id = parsePageId(pageIdOrUrl, { uuid: false })

  if (!id) {
    return null
  }

  const paths = [`/${id}`]
  const prettyPath = config.inversePageUrlOverrides[id]

  if (prettyPath) {
    paths.push(`/${prettyPath}`)
  }

  if (id === config.rootNotionPageId) {
    paths.push('/')
  }

  return paths
}

export type RevalidateResult = {
  revalidated: string[]
  failed: Array<{ path: string; error: string }>
}

/**
 * 주소를 하나씩 차례로 다시 만든다. 동시에 돌리면 Notion 429로 전부 실패하기 쉽다.
 *
 * 실패한 주소는 getStaticProps가 던진 것이라 옛 캐시가 그대로 남아 있다.
 */
export async function revalidatePaths(
  res: NextApiResponse,
  paths: string[]
): Promise<RevalidateResult> {
  const result: RevalidateResult = { revalidated: [], failed: [] }

  for (const path of paths) {
    try {
      await res.revalidate(path)
      result.revalidated.push(path)
    } catch (err) {
      result.failed.push({ path, error: (err as Error).message })
    }
  }

  return result
}
