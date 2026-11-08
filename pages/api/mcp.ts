import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { type NextApiRequest, type NextApiResponse } from 'next'

import { loadSiteConfig } from '@/lib/load-site-config'
import { type ToolContext } from '@/lib/mcp/context'
import { getRequestOrigin } from '@/lib/mcp/site'
import { registerDiagnoseTools } from '@/lib/mcp/tools/diagnose'
import { registerOperateTools } from '@/lib/mcp/tools/operate'
import { registerReadTools } from '@/lib/mcp/tools/read'
import { registerStatsTools } from '@/lib/mcp/tools/stats'
import { isBearerAuthorized } from '@/lib/revalidate'

/**
 * 사이트를 AI가 읽고 진단하고 운영하게 하는 MCP 서버 (Streamable HTTP).
 *
 * 사이트마다 자기 MCP를 갖는다. 별도 서버를 두지 않는 이유는 진단 도구가 "이
 * 배포"의 캐시와 설정을 봐야 하고, 즉시 갱신(`res.revalidate`)은 이 앱 안에서만
 * 부를 수 있기 때문이다.
 *
 * 무상태로 돈다. 요청마다 서버와 트랜스포트를 새로 만든다. 서버리스 함수는 요청
 * 사이에 메모리를 이어 쓴다는 보장이 없어서 세션을 들고 있을 수 없다.
 *
 * `MCP_SECRET`이 없으면 404다(fail-closed). 인증은 `Authorization: Bearer`만 본다.
 *
 * @see docs/mcp.md
 */

export const config = {
  // 링크 확인과 캐시 데우기는 여러 번 바깥을 다녀온다. Vercel 기본 제한보다 길게 둔다
  maxDuration: 60
}

const secret = process.env.MCP_SECRET || undefined

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store')

  if (!secret) {
    return res.status(404).json({ error: 'not found' })
  }

  if (!isBearerAuthorized(req.headers.authorization, secret)) {
    res.setHeader('WWW-Authenticate', 'Bearer')
    return res.status(401).json({ error: 'unauthorized' })
  }

  // 무상태라 서버가 먼저 말을 거는 SSE 스트림(GET)과 세션 종료(DELETE)가 없다
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32_000, message: 'Method not allowed' },
      id: null
    })
  }

  const ctx: ToolContext = {
    config: loadSiteConfig(),
    origin: getRequestOrigin(req),
    res
  }

  const server = new McpServer({ name: 'folionote', version: '0.1.0' })
  registerReadTools(server, ctx)
  registerDiagnoseTools(server, ctx)
  registerOperateTools(server, ctx)
  registerStatsTools(server, ctx)

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    // 스트리밍할 진행 알림이 없다. JSON 한 번으로 돌려주면 프록시와 로그가 단순하다
    enableJsonResponse: true
  })

  res.on('close', () => {
    void transport.close()
    void server.close()
  })

  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
}
