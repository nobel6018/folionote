import { isPageViewCountAvailable, readPageView } from '@folionote/core/server'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import * as z from 'zod'

import { json, type ToolContext, toolError } from '../context'
import { resolvePage } from '../site'

export function registerStatsTools(server: McpServer, ctx: ToolContext) {
  const { config } = ctx

  server.registerTool(
    'get_pageviews',
    {
      title: '페이지뷰',
      description:
        '페이지마다 오늘과 누적 페이지뷰를 돌려준다. Redis(isRedisEnabled)와 페이지뷰 카운트가 켜진 사이트에서만 된다. 카운트는 페이지 위젯이 부를 때 쌓이므로 위젯을 끈 페이지는 0이다.',
      inputSchema: {
        pages: z.array(z.string().trim()).min(1).max(50).meta({
          description: '사이트 주소(/about) 또는 Notion 페이지 ID 목록'
        })
      },
      annotations: { readOnlyHint: true }
    },
    async ({ pages }) => {
      if (!isPageViewCountAvailable(config)) {
        return toolError(
          '이 사이트는 페이지뷰를 저장하지 않습니다(Redis 또는 pageViewCount 설정이 꺼져 있음)'
        )
      }

      const rows = await Promise.all(
        pages.map(async (page) => {
          const resolved = resolvePage(config, page)
          if (!resolved) {
            return { page, error: '페이지를 찾지 못했습니다' }
          }

          const counts = await readPageView(config, resolved.pageId)
          return counts
            ? { path: resolved.path, pageId: resolved.pageId, ...counts }
            : { path: resolved.path, error: '저장소에 연결하지 못했습니다' }
        })
      )

      return json({ timeZone: config.pageViewCount.timeZone, pages: rows })
    }
  )
}
