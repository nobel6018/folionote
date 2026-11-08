import { getNotion } from '@folionote/core/server'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBlockValue, idToUuid } from 'notion-utils'
import * as z from 'zod'

import { json, type ToolContext, toolError } from '../context'
import {
  describeCache,
  extractLinks,
  fetchSite,
  mapWithLimit,
  readMeta,
  readNextData,
  resolvePage,
  stampBlocks
} from '../site'

/** 한 번에 확인할 링크 수. 함수 제한 시간 안에 끝나야 한다 */
const MAX_LINKS = 60
const LINK_TIMEOUT_MS = 10_000

type LinkKind = 'notion-file' | 'notion-image' | 'internal' | 'external'

export function registerDiagnoseTools(server: McpServer, ctx: ToolContext) {
  const { config, origin } = ctx

  server.registerTool(
    'check_freshness',
    {
      title: '사이트가 Notion과 같은지',
      description:
        '방문자가 지금 받는 페이지(캐시된 HTML)와 Notion의 현재 내용을 블록 단위로 비교한다. 다르면 바뀐 블록 수와 일부 문장, 캐시 상태(HIT/STALE, age)를 돌려준다. "Notion에서 고쳤는데 사이트가 그대로"일 때 먼저 쓴다. 다르면 revalidate로 바로 갱신할 수 있다.',
      inputSchema: {
        page: z.string().trim().meta({
          description:
            '사이트 주소(/about), Notion 페이지 ID, Notion 페이지 주소 중 하나'
        })
      },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    async ({ page }) => {
      const resolved = resolvePage(config, page)
      if (!resolved) {
        return toolError(`페이지를 찾지 못했습니다: ${page}`)
      }

      // 사이트 쪽이 먼저다. Notion을 먼저 읽으면 그 사이 재생성이 일어나 둘이 같아 보일 수 있다
      const site = await fetchSite(origin, resolved.path)
      const nextData = readNextData(site.body)
      const siteRecordMap = nextData?.props?.pageProps?.recordMap

      if (site.status !== 200 || !siteRecordMap) {
        return json({
          path: resolved.path,
          status: site.status,
          ...describeCache(site.headers),
          fresh: null,
          note: '사이트 응답에 페이지 데이터가 없습니다. 상태 코드와 주소를 확인하세요.'
        })
      }

      const notionRecordMap = await getNotion().getPage(
        idToUuid(resolved.pageId)
      )
      const notion = stampBlocks(notionRecordMap)
      const cached = stampBlocks(siteRecordMap)

      const changed: string[] = []
      for (const [id, editedAt] of notion) {
        if (cached.get(id) !== editedAt) {
          changed.push(id)
        }
      }

      // 사이트에만 있는 블록이 Notion에서 지워진 것인지는 부모를 보고 판단한다.
      // 부모가 Notion에 있는데 그 자식 목록에서 빠졌으면 지워진 것이다. 내비게이션
      // 링크처럼 다른 페이지에서 합쳐 온 블록은 부모(루트)의 자식 목록에 그대로 있다.
      const removed = [...cached.keys()].filter((id) => {
        if (notion.has(id)) return false
        const block = getBlockValue(siteRecordMap.block[id]) as any
        const parent = getBlockValue(
          notionRecordMap.block[block?.parent_id] as any
        ) as any
        return Boolean(parent) && !parent.content?.includes(id)
      })

      return json({
        path: resolved.path,
        pageId: resolved.pageId,
        fresh: changed.length === 0 && removed.length === 0,
        notionLastEditedAt: latest(notion, notion.keys()),
        siteBuiltFromEditAt: latest(cached, notion.keys()),
        changedBlocks: changed.length,
        removedBlocks: removed.length,
        changedSamples: changed.slice(0, 5).map((id) => {
          const block = getBlockValue(notionRecordMap.block[id] as any) as any
          return {
            id,
            type: block?.type,
            text:
              block?.properties?.title
                ?.map((d: any) => d[0])
                .join('')
                .slice(0, 120) ?? null
          }
        }),
        ...describeCache(site.headers),
        revalidateSeconds: 600
      })
    }
  )

  server.registerTool(
    'check_links',
    {
      title: '깨진 링크 찾기',
      description:
        '방문자가 받는 페이지 HTML의 링크를 실제로 열어 4xx/5xx를 찾는다. 기본은 Notion 파일(다운로드, PDF, 동영상)과 사이트 안 링크만 본다. Notion에서 파일을 바꾼 뒤 캐시된 페이지가 지워진 파일을 가리키는 경우가 여기서 잡힌다.',
      inputSchema: {
        page: z
          .string()
          .trim()
          .meta({ description: '사이트 주소(/about) 또는 Notion 페이지 ID' }),
        includeImages: z.boolean().default(false).meta({
          description: 'Notion 이미지 프록시(www.notion.so/image)도 볼지'
        }),
        includeExternal: z.boolean().default(false).meta({
          description: '바깥 사이트 링크도 볼지. 느리고 봇을 막는 곳이 많다'
        })
      },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    async ({ page, includeImages, includeExternal }) => {
      const resolved = resolvePage(config, page)
      if (!resolved) {
        return toolError(`페이지를 찾지 못했습니다: ${page}`)
      }

      const site = await fetchSite(origin, resolved.path)
      const host = new URL(origin).host

      const candidates = extractLinks(site.body)
        .map((raw) => {
          try {
            const url = new URL(raw, origin)
            return { url: url.toString(), kind: classify(url, host) }
          } catch {
            return null
          }
        })
        .filter((link): link is { url: string; kind: LinkKind } => {
          if (!link || !/^https?:$/.test(new URL(link.url).protocol)) {
            return false
          }
          // 빌드 산출물(JS, CSS, 폰트)은 배포가 책임진다. 글의 링크만 본다
          if (link.url.includes('/_next/')) return false
          if (link.kind === 'notion-image') return includeImages
          if (link.kind === 'external') return includeExternal
          return true
        })

      const targets = candidates.slice(0, MAX_LINKS)
      const checked = await mapWithLimit(targets, 4, async (link) => ({
        ...link,
        ...(await probe(link.url))
      }))

      return json({
        path: resolved.path,
        pageStatus: site.status,
        ...describeCache(site.headers),
        checked: checked.length,
        skipped: candidates.length - targets.length,
        broken: checked.filter((link) => !link.ok)
      })
    }
  )

  server.registerTool(
    'seo_audit',
    {
      title: 'SEO 점검',
      description:
        '사이트 전체(robots.txt, sitemap.xml, noindex 설정)와 페이지 하나(title, description, canonical, og:image, robots)를 점검해 문제 목록을 돌려준다.',
      inputSchema: {
        page: z
          .string()
          .trim()
          .default('/')
          .meta({ description: '점검할 사이트 주소 또는 Notion 페이지 ID' })
      },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    async ({ page }) => {
      const resolved = resolvePage(config, page)
      if (!resolved) {
        return toolError(`페이지를 찾지 못했습니다: ${page}`)
      }

      const issues: string[] = []
      const [robots, sitemap, html] = await Promise.all([
        fetchSite(origin, '/robots.txt'),
        fetchSite(origin, '/sitemap.xml'),
        fetchSite(origin, resolved.path)
      ])

      if (config.noindex) {
        issues.push('사이트 전체가 noindex입니다(site.config.ts noindex)')
      }
      if (blocksEveryone(robots.body)) {
        issues.push('robots.txt가 사이트 전체 크롤링을 막습니다')
      }

      const sitemapUrls = (sitemap.body.match(/<loc>/g) ?? []).length
      if (sitemap.status !== 200 || sitemapUrls === 0) {
        issues.push(`sitemap.xml에 주소가 없습니다(상태 ${sitemap.status})`)
      }

      const meta = readMeta(html.body)
      const expectedCanonical = `https://${config.domain}${resolved.path === '/' ? '' : resolved.path}`

      if (html.status !== 200) {
        issues.push(`페이지가 ${html.status}를 돌려줍니다`)
      }
      if (!meta.title) {
        issues.push('title이 없습니다')
      }
      if (!meta.description) {
        issues.push('meta description이 없습니다')
      } else if (meta.description.length > 160) {
        issues.push(
          `meta description이 ${meta.description.length}자입니다. 검색 결과에서 160자 근처에서 잘립니다`
        )
      }
      if (!meta.canonical) {
        issues.push('canonical이 없습니다')
      } else if (meta.canonical.replace(/\/$/, '') !== expectedCanonical) {
        issues.push(
          `canonical(${meta.canonical})이 이 주소(${expectedCanonical})와 다릅니다`
        )
      }
      if (!meta.ogImage) {
        issues.push('og:image가 없습니다. 공유 미리보기에 그림이 안 나옵니다')
      }
      if (meta.robots?.includes('noindex')) {
        issues.push(`이 페이지가 검색에서 빠집니다(robots: ${meta.robots})`)
      }

      return json({
        path: resolved.path,
        site: {
          noindex: config.noindex,
          sitemapStatus: sitemap.status,
          sitemapUrls,
          prettyUrlCount: Object.keys(config.pageUrlOverrides).length,
          robotsStatus: robots.status
        },
        page: { status: html.status, ...meta },
        issues
      })
    }
  )
}

/**
 * robots.txt의 `User-agent: *` 묶음이 사이트 전체를 막는지. 특정 봇(AI 크롤러 등)만
 * 막는 묶음은 의도한 것이라 문제로 보지 않는다.
 */
function blocksEveryone(robots: string): boolean {
  let inStarGroup = false
  let lastWasAgent = false

  for (const raw of robots.split('\n')) {
    const line = raw.replace(/#.*/, '').trim()
    const [field, ...rest] = line.split(':')
    const key = field?.trim().toLowerCase()
    const value = rest.join(':').trim()

    if (key === 'user-agent') {
      // 연달아 오는 User-agent 줄은 같은 묶음이다
      inStarGroup = (lastWasAgent && inStarGroup) || value === '*'
      lastWasAgent = true
      continue
    }

    lastWasAgent = false
    if (inStarGroup && key === 'disallow' && value === '/') {
      return true
    }
  }

  return false
}

/** 블록들의 가장 늦은 수정 시각 */
function latest(stamps: Map<string, number>, ids: Iterable<string>) {
  let max = 0
  for (const id of ids) max = Math.max(max, stamps.get(id) ?? 0)
  return max ? new Date(max).toISOString() : null
}

function classify(url: URL, host: string): LinkKind {
  if (url.host === host) return 'internal'
  if (
    url.host === 'file.notion.so' ||
    (url.host.endsWith('notion.so') && url.pathname.startsWith('/signed/'))
  ) {
    return 'notion-file'
  }
  if (url.host.endsWith('notion.so') && url.pathname.startsWith('/image/')) {
    return 'notion-image'
  }
  return 'external'
}

async function probe(
  url: string
): Promise<{ ok: boolean; status: number | null; error?: string }> {
  try {
    // HEAD를 안 받는 곳이 있어 GET으로 열고 본문은 버린다
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'folionote-mcp' },
      signal: AbortSignal.timeout(LINK_TIMEOUT_MS)
    })
    await res.body?.cancel()
    return { ok: res.status < 400, status: res.status }
  } catch (err) {
    return { ok: false, status: null, error: (err as Error).message }
  }
}
