import ExpiryMap from 'expiry-map'
import pMemoize from 'p-memoize'

import type * as types from '../types.js'

/**
 * 검색 API 경로. 사이트마다 달라지지 않는 우리 라우트라 설정에서 받지 않는다
 * (@see lib/site-config-resolve.ts의 `api`).
 */
const SEARCH_NOTION_PATH = '/api/search-notion'

export const searchNotion = pMemoize(searchNotionImpl, {
  cacheKey: (args) => args[0]?.query,
  cache: new ExpiryMap(10_000)
})

async function searchNotionImpl(
  params: types.SearchParams
): Promise<types.SearchResults> {
  return fetch(SEARCH_NOTION_PATH, {
    method: 'POST',
    body: JSON.stringify(params),
    headers: {
      'content-type': 'application/json'
    }
  })
    .then((res) => {
      if (res.ok) {
        return res
      }

      // convert non-2xx HTTP responses into errors
      const error: any = new Error(res.statusText)
      error.response = res
      throw error
    })
    .then((res) => res.json() as Promise<types.SearchResults>)
}
