import { getPage, search } from '@folionote/core/server'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { getBlockValue, getPageTitle, idToUuid } from 'notion-utils'
import * as z from 'zod'

import { isRevalidateApiEnabled } from '../../revalidate'
import { json, type ToolContext, toolError } from '../context'
import { recordMapToMarkdown } from '../markdown'
import { pathForPageId, resolvePage } from '../site'
import { isAddPageUrlEnabled } from './operate'

/** 본문이 이보다 길면 자른다. 긴 데이터베이스 페이지 하나가 컨텍스트를 다 먹는다 */
const MAX_MARKDOWN_CHARS = 60_000

export function registerReadTools(server: McpServer, ctx: ToolContext) {
  const { config } = ctx

  server.registerTool(
    'get_site_config',
    {
      title: '사이트 설정 요약',
      description:
        '사이트 이름, 도메인, 루트 Notion 페이지, 주소 규칙(strictPaths), noindex, 켜진 기능을 돌려준다. 다른 도구를 쓰기 전에 사이트가 어떻게 설정됐는지 볼 때 쓴다.',
      inputSchema: {},
      annotations: { readOnlyHint: true }
    },
    async () =>
      json({
        name: config.name,
        domain: config.domain,
        language: config.language,
        rootNotionPageId: config.rootNotionPageId,
        strictPaths: config.strictPaths,
        noindex: config.noindex,
        prettyUrlCount: Object.keys(config.pageUrlOverrides).length,
        additionalUrlCount: Object.keys(config.pageUrlAdditions).length,
        features: {
          search: config.isSearchEnabled,
          pageViewCount: config.pageViewCount.enabled,
          redis: config.isRedisEnabled,
          revalidateApi: isRevalidateApiEnabled(),
          addPageUrl: isAddPageUrlEnabled()
        },
        origin: ctx.origin
      })
  )

  server.registerTool(
    'list_pages',
    {
      title: '페이지 주소 목록',
      description:
        '사이트에 pretty URL로 등록된 페이지(site.config.ts의 pageUrlOverrides, pageUrlAdditions)와 루트 페이지를 주소와 Notion ID로 돌려준다. strictPaths가 켜진 사이트에서는 이 목록 밖 페이지가 ID 주소로만 열린다. 제목은 Notion을 다시 읽어야 해서 넣지 않는다. 제목이 필요하면 get_page를 쓴다.',
      inputSchema: {
        query: z.string().trim().optional().meta({
          description: '주소에 이 문자열이 들어간 것만 (예: "books")'
        }),
        offset: z.int().min(0).default(0),
        limit: z.int().min(1).max(500).default(100)
      },
      annotations: { readOnlyHint: true }
    },
    async ({ query, offset, limit }) => {
      const entries = [
        { path: '/', pageId: config.rootNotionPageId, source: 'root' },
        ...Object.entries(config.pageUrlOverrides).map(([key, pageId]) => ({
          path: `/${key}`,
          pageId,
          source: 'pageUrlOverrides'
        })),
        ...Object.entries(config.pageUrlAdditions).map(([key, pageId]) => ({
          path: `/${key}`,
          pageId,
          source: 'pageUrlAdditions'
        }))
      ].filter((entry) => !query || entry.path.includes(query))

      return json({
        total: entries.length,
        offset,
        pages: entries.slice(offset, offset + limit).map((entry) => ({
          ...entry,
          url: `https://${config.domain}${entry.path}`
        }))
      })
    }
  )

  server.registerTool(
    'get_page',
    {
      title: '페이지 본문 읽기',
      description:
        'Notion에서 지금 페이지를 읽어 제목, 마지막 수정 시각, 본문(markdown)을 돌려준다. 사이트 캐시가 아니라 Notion의 현재 내용이다. 사이트에 실제로 나가는 내용과 비교하려면 check_freshness를 쓴다.',
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

      const recordMap = await getPage(config, resolved.pageId)
      const uuid = idToUuid(resolved.pageId)
      const block = getBlockValue(recordMap.block[uuid] as any) as any
      let markdown = recordMapToMarkdown(recordMap, uuid)
      const truncated = markdown.length > MAX_MARKDOWN_CHARS

      if (truncated) {
        markdown = markdown.slice(0, MAX_MARKDOWN_CHARS)
      }

      return json({
        pageId: resolved.pageId,
        path: resolved.path,
        url: `https://${config.domain}${resolved.path}`,
        title: getPageTitle(recordMap),
        lastEditedAt: block?.last_edited_time
          ? new Date(block.last_edited_time).toISOString()
          : null,
        truncated,
        markdown
      })
    }
  )

  server.registerTool(
    'search',
    {
      title: '사이트 글 검색',
      description:
        '루트 페이지 아래에서 Notion 검색으로 글을 찾아 제목, 주소, 일치한 부분을 돌려준다.',
      inputSchema: {
        query: z.string().trim().min(1),
        limit: z.int().min(1).max(50).default(10)
      },
      annotations: { readOnlyHint: true, openWorldHint: true }
    },
    async ({ query, limit }) => {
      const results = await search({
        query,
        ancestorId: config.rootNotionPageId,
        limit
      })

      return json({
        total: results.total,
        results: results.results.map((result: any) => {
          const block = getBlockValue(
            results.recordMap.block[result.id] as any
          ) as any
          const id = String(result.id).replaceAll('-', '')

          return {
            pageId: id,
            title:
              block?.properties?.title?.map((d: any) => d[0]).join('') ?? null,
            path: pathForPageId(config, id),
            // Notion이 일치 부분을 임의 이름의 태그(<gzkNfoUU>)로 감싸 보낸다
            highlight:
              result.highlight?.text?.replaceAll(/<\/?[A-Za-z]+>/g, '') ?? null
          }
        })
      })
    }
  )
}
