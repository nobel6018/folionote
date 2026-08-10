import { NotionAPI } from 'notion-client'

export const notion = new NotionAPI({
  apiBaseUrl: process.env.NOTION_API_BASE_URL,
  // Notion은 User-Agent가 없는 요청(undici/node fetch 기본값)을 403으로 차단한다.
  // 브라우저 UA를 명시해야 www.notion.so/api/v3 호출이 통과된다.
  ofetchOptions: {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    }
  }
})
