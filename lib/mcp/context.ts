import { type ResolvedSiteConfig } from '@folionote/core/config'
import { type CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { type NextApiResponse } from 'next'

/** 도구 하나가 요청 하나 동안 쓰는 것. 요청마다 새로 만든다(무상태 MCP) */
export type ToolContext = {
  config: ResolvedSiteConfig
  /** 이 요청이 들어온 사이트 주소. 진단 도구가 자기 사이트를 다시 요청할 때 쓴다 */
  origin: string
  /** `res.revalidate()`가 여기 붙어 있다 */
  res: NextApiResponse
}

/** 결과는 JSON 한 덩어리로 준다. 모델이 표로 다시 그리기 쉽다 */
export function json(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] }
}

/** 도구가 실패했다는 것을 모델이 알게 isError로 돌려준다. 던지면 원인이 뭉개진다 */
export function toolError(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] }
}
