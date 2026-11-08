import { serializeSiteConfig, type SiteConfig } from '@folionote/core/config'
import { type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { parsePageId } from 'notion-utils'
import * as z from 'zod'

import siteConfigSource from '../../../site.config'
import { configFilePath, githubBranch, githubRepo } from '../../admin/env'
import { commitFile } from '../../admin/github'
import {
  getPagePaths,
  isSitePath,
  MAX_REVALIDATE_PATHS,
  revalidatePaths
} from '../../revalidate'
import { json, type ToolContext, toolError } from '../context'
import { describeCache, fetchSite } from '../site'

/** warm_cache가 쓸 수 있는 시간. 함수 제한 시간(maxDuration)보다 넉넉히 짧게 둔다 */
const WARM_BUDGET_MS = 45_000

/**
 * add_page_url이 GitHub에 커밋할 때 쓰는 토큰. 어드민은 로그인한 사람의 OAuth 토큰을
 * 쓰지만 MCP 호출에는 브라우저 세션이 없다. 이 리포 하나에 Contents 쓰기만 준
 * fine-grained 토큰을 권한다.
 */
const githubToken = process.env.MCP_GITHUB_TOKEN || undefined

export function isAddPageUrlEnabled(): boolean {
  return Boolean(githubToken && githubRepo)
}

export function registerOperateTools(server: McpServer, ctx: ToolContext) {
  const { config, origin, res } = ctx

  server.registerTool(
    'revalidate',
    {
      title: '지금 다시 만들기',
      description:
        '페이지를 10분 ISR 주기를 기다리지 않고 지금 Notion에서 다시 읽어 캐시를 바꾼다. page를 주면 그 페이지의 pretty URL과 ID 주소를 함께 다시 만든다. 실패한 주소는 옛 캐시가 남는다(대개 Notion 429라 잠시 뒤 다시 부르면 된다).',
      inputSchema: {
        page: z
          .string()
          .trim()
          .optional()
          .meta({ description: 'Notion 페이지 ID 또는 Notion 페이지 주소' }),
        paths: z
          .array(z.string().trim())
          .max(MAX_REVALIDATE_PATHS)
          .optional()
          .meta({
            description: '다시 만들 사이트 주소들 (예: ["/", "/about"])'
          })
      },
      annotations: { readOnlyHint: false, idempotentHint: true }
    },
    async ({ page, paths }) => {
      let targets: string[] | null = null

      if (paths?.length) {
        if (!paths.every(isSitePath)) {
          return toolError('paths는 /로 시작하는 사이트 주소여야 합니다')
        }
        targets = [...new Set(paths)]
      } else if (page) {
        targets = page.startsWith('/') ? [page] : getPagePaths(config, page)
      }

      if (!targets) {
        return toolError('page 또는 paths 중 하나를 주세요')
      }

      return json(await revalidatePaths(res, targets))
    }
  )

  server.registerTool(
    'add_page_url',
    {
      title: 'pretty URL 추가',
      description: `Notion 페이지에 사이트 주소(예: /books/12)를 붙인다. ${configFilePath}의 pageUrlOverrides에 한 줄을 넣어 GitHub(${githubRepo ?? '미설정'}, ${githubBranch})에 커밋하고, 그 커밋이 재배포를 일으킨다. strictPaths가 켜진 사이트는 새 글을 여기 등록해야 그 주소로 열린다. 파일 전체를 다시 쓰므로 손으로 단 주석은 사라진다(어드민 저장과 같다). dryRun으로 먼저 확인할 수 있다.`,
      inputSchema: {
        path: z
          .string()
          .trim()
          .meta({ description: '붙일 주소. /로 시작 (예: /books/12)' }),
        page: z
          .string()
          .trim()
          .meta({ description: 'Notion 페이지 ID 또는 Notion 페이지 주소' }),
        dryRun: z
          .boolean()
          .default(false)
          .meta({ description: 'true면 커밋하지 않고 넣을 내용만 돌려준다' })
      },
      annotations: { readOnlyHint: false, destructiveHint: false }
    },
    async ({ path, page, dryRun }) => {
      if (!isAddPageUrlEnabled()) {
        return toolError(
          'MCP_GITHUB_TOKEN 환경변수가 없어 커밋할 수 없습니다. docs/mcp.md의 add_page_url 절을 보세요.'
        )
      }

      const key = path.replace(/\/$/, '')
      if (!isSitePath(key) || key === '') {
        return toolError(`주소 형식이 맞지 않습니다: ${path}`)
      }

      const pageId = parsePageId(page, { uuid: false })
      if (!pageId) {
        return toolError(`Notion 페이지 ID를 읽지 못했습니다: ${page}`)
      }

      const existing = config.pageUrlOverrides[key.slice(1)]
      if (existing) {
        return toolError(`${key}는 이미 ${existing} 페이지에 쓰이고 있습니다`)
      }

      // 한 페이지에 pretty URL이 둘이면 사이트가 링크를 어느 쪽으로 걸지 정할 수 없다
      const current = config.inversePageUrlOverrides[pageId]
      if (current) {
        return toolError(`이 페이지는 이미 /${current} 주소를 갖고 있습니다`)
      }

      // 어드민 GET과 같은 이유로 필수 값을 실제로 쓰이는 값으로 채운다. 환경변수로
      // 띄운 사이트에서 파일 내용만 직렬화하면 필수 값이 빈 설정이 커밋돼 사이트가 죽는다.
      const next: SiteConfig = {
        ...siteConfigSource,
        rootNotionPageId: config.rootNotionPageId,
        name: config.name,
        author: config.author,
        domain: config.domain,
        pageUrlOverrides: {
          ...siteConfigSource.pageUrlOverrides,
          [key]: pageId
        }
      }

      const line = `'${key}': '${pageId}'`

      if (dryRun) {
        return json({ dryRun: true, file: configFilePath, add: line })
      }

      try {
        const commit = await commitFile({
          token: githubToken!,
          repoPath: configFilePath,
          content: serializeSiteConfig(next),
          message: `chore(config): ${key} 주소 추가`,
          login: 'folionote-mcp',
          via: 'MCP add_page_url'
        })

        return json({
          committed: true,
          add: line,
          commitUrl: commit.commitUrl,
          note: '재배포가 끝나면(보통 1~2분) 새 주소가 열립니다'
        })
      } catch (err) {
        const message = (err as Error).message
        return toolError(
          message.includes('409')
            ? '그 사이 설정 파일이 바뀌었습니다. 다시 부르면 최신 파일 기준으로 넣습니다.'
            : `커밋에 실패했습니다: ${message}`
        )
      }
    }
  )

  server.registerTool(
    'warm_cache',
    {
      title: '캐시 데우기',
      description:
        '페이지를 미리 한 번씩 요청해 캐시를 채운다. 배포 직후 첫 방문자가 느린 페이지를 받지 않게 할 때 쓴다. paths를 안 주면 sitemap.xml의 주소를 앞에서부터 쓴다. Notion 429를 피하려고 하나씩 차례로 돌고 45초가 넘으면 멈춘다.',
      inputSchema: {
        paths: z.array(z.string().trim()).max(100).optional(),
        limit: z.int().min(1).max(100).default(20)
      },
      annotations: { readOnlyHint: false, idempotentHint: true }
    },
    async ({ paths, limit }) => {
      let targets = paths?.filter(isSitePath)

      if (!targets?.length) {
        const sitemap = await fetchSite(origin, '/sitemap.xml')
        targets = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)]
          .map((m) => {
            try {
              return new URL(m[1]!).pathname
            } catch {
              return null
            }
          })
          .filter(Boolean)
      }

      targets = targets.slice(0, limit)
      const started = Date.now()
      const results: Array<Record<string, unknown>> = []

      for (const path of targets) {
        if (Date.now() - started > WARM_BUDGET_MS) break

        const t0 = Date.now()
        try {
          const page = await fetchSite(origin, path)
          results.push({
            path,
            status: page.status,
            ...describeCache(page.headers),
            ms: Date.now() - t0
          })
        } catch (err) {
          results.push({ path, error: (err as Error).message })
        }
      }

      return json({
        requested: targets.length,
        done: results.length,
        stoppedByTimeBudget: results.length < targets.length,
        results
      })
    }
  )
}
