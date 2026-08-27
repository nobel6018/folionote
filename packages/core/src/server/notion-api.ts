import { NotionAPI } from 'notion-client'

import { type CoreDeps } from './deps.js'

/**
 * Notion 비공식 API 클라이언트.
 *
 * 모듈 최상단에서 만들지 않는다. import만으로 클라이언트가 생기면 이 모듈을 스치는
 * 모든 런타임(edge 포함)이 대가를 치르고, 호스팅 서비스가 자기 클라이언트로
 * 갈아끼울 자리도 사라진다.
 */
export function createNotionClient(): NotionAPI {
  return new NotionAPI({
    apiBaseUrl: process.env.NOTION_API_BASE_URL,
    // Notion은 User-Agent가 없는 요청(undici/node fetch 기본값)을 403으로 차단한다.
    // 브라우저 UA를 명시해야 www.notion.so/api/v3 호출이 통과된다.
    ofetchOptions: {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      },
      // Notion의 비공식 API는 짧은 시간에 여러 페이지를 읽으면 429를 준다.
      // 사이트맵과 RSS는 전체 페이지를 훑기 때문에 재시도가 없으면 매번 일부를 잃는다.
      // ofetch의 기본 retry는 POST에 0이라(멱등하지 않다고 보기 때문) 명시해야 한다.
      // Notion API는 전부 POST지만 loadPageChunk는 읽기 전용이라 재시도가 안전하다.
      retry: 3,
      retryDelay: 500,
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
      timeout: 30_000
    }
  })
}

let defaultNotion: NotionAPI | undefined

export function getNotion(deps?: CoreDeps): NotionAPI {
  if (deps?.notion) {
    return deps.notion
  }

  defaultNotion ??= createNotionClient()
  return defaultNotion
}
