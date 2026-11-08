import { type IncomingMessage } from 'node:http'

import { type ResolvedSiteConfig } from '@folionote/core/config'
import { type ExtendedRecordMap } from 'notion-types'
import { getBlockValue, parsePageId } from 'notion-utils'

/**
 * MCP 도구들이 같이 쓰는 도우미. 사이트 자신에게 HTTP로 묻는 것들이 여기 있다.
 *
 * 진단 도구는 Notion이 아니라 **방문자가 실제로 받는 HTML**을 봐야 한다. "사이트가
 * Notion과 다르다"는 문제는 캐시된 HTML에서 생기기 때문이다. 그래서 자기 사이트를
 * 공개 주소로 다시 요청한다.
 *
 * @see docs/mcp.md
 */

const FETCH_TIMEOUT_MS = 15_000

/**
 * 이 요청이 들어온 사이트 주소. 설정의 domain이 아니라 실제 호스트를 쓴다.
 * 프리뷰 배포나 로컬에서 부르면 그 배포를 봐야 하기 때문이다.
 */
export function getRequestOrigin(req: IncomingMessage): string {
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ??
    (String(host).startsWith('localhost') ? 'http' : 'https')

  return `${proto}://${String(host).split(',')[0]}`
}

export type ResolvedPage = { pageId: string; path: string }

/**
 * 주소(`/about`), Notion ID, Notion 페이지 주소 중 무엇을 받아도 페이지 ID와 사이트
 * 주소를 함께 돌려준다. 사이트에 없는 주소면 null.
 */
export function resolvePage(
  config: ResolvedSiteConfig,
  target: string
): ResolvedPage | null {
  const value = target.trim()

  if (value === '/' || value === '') {
    return { pageId: config.rootNotionPageId, path: '/' }
  }

  if (value.startsWith('/')) {
    const key = value.slice(1).replace(/\/$/, '')
    const fromMap = config.pageUrlOverrides[key] ?? config.pageUrlAdditions[key]

    if (fromMap) {
      return { pageId: fromMap, path: `/${key}` }
    }

    const id = parsePageId(key, { uuid: false })
    return id ? { pageId: id, path: pathForPageId(config, id) } : null
  }

  const id = parsePageId(value, { uuid: false })
  return id ? { pageId: id, path: pathForPageId(config, id) } : null
}

/** 사이트가 이 페이지에 붙이는 대표 주소. pretty URL이 있으면 그쪽 */
export function pathForPageId(config: ResolvedSiteConfig, id: string): string {
  if (id === config.rootNotionPageId) {
    return '/'
  }

  const pretty = config.inversePageUrlOverrides[id]
  return pretty ? `/${pretty}` : `/${id}`
}

export type FetchedPage = {
  url: string
  status: number
  headers: Record<string, string>
  body: string
}

export async function fetchSite(
  origin: string,
  path: string,
  init?: RequestInit
): Promise<FetchedPage> {
  const url = new URL(path, origin).toString()
  const res = await fetch(url, {
    redirect: 'follow',
    ...init,
    headers: { 'user-agent': 'folionote-mcp', ...init?.headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  })

  return {
    url,
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: await res.text()
  }
}

/** 캐시 상태를 사람이 읽기 좋게. Vercel이 아니면 해당 헤더가 없을 수 있다 */
export function describeCache(headers: Record<string, string>) {
  const age = Number(headers.age)
  return {
    cache: headers['x-vercel-cache'] ?? headers['x-nextjs-cache'] ?? null,
    ageSeconds: Number.isFinite(age) ? age : null
  }
}

/** Next가 HTML에 실어 보내는 페이지 props. recordMap이 여기 그대로 있다 */
export function readNextData(html: string): any | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/
  )

  if (!match) {
    return null
  }

  try {
    return JSON.parse(match[1]!)
  } catch {
    return null
  }
}

export type BlockStamp = { id: string; editedAt: number }

/** 블록마다 마지막 수정 시각. 비교는 이 표 두 개로 한다 */
export function stampBlocks(recordMap: ExtendedRecordMap | undefined) {
  const stamps = new Map<string, number>()

  for (const [id, record] of Object.entries(recordMap?.block ?? {})) {
    const block = getBlockValue(record as any) as any
    if (block?.alive === false) continue
    if (typeof block?.last_edited_time === 'number') {
      stamps.set(id, block.last_edited_time)
    }
  }

  return stamps
}

/** HTML에서 href, src를 뽑는다. 정규식이면 충분하다. 우리 렌더러가 만든 HTML이다 */
export function extractLinks(html: string): string[] {
  const links = new Set<string>()

  for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    links.add(match[1]!.replaceAll('&amp;', '&'))
  }

  return [...links]
}

export function readMeta(html: string) {
  const attr = (pattern: RegExp) => html.match(pattern)?.[1]?.trim() ?? null

  return {
    title: attr(/<title[^>]*>([^<]*)<\/title>/),
    description: attr(/<meta name="description" content="([^"]*)"/),
    canonical: attr(/<link rel="canonical" href="([^"]*)"/),
    ogImage: attr(/<meta property="og:image" content="([^"]*)"/),
    robots: attr(/<meta name="robots" content="([^"]*)"/)
  }
}

/** 동시에 n개씩만 돈다. 같은 Notion 파일 서버에 한꺼번에 몰리면 429가 난다 */
export async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = Array.from({ length: items.length })
  let next = 0

  async function worker() {
    while (next < items.length) {
      const index = next++
      results[index] = await fn(items[index]!)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
  return results
}
