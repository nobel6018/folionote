import { type NotionAPI } from 'notion-client'

/**
 * 호스팅 서비스가 자기 것을 끼워 넣는 자리.
 *
 * 자체 호스팅 앱은 아무것도 넘기지 않는다. 그러면 Keyv(+Redis) 캐시와 이 패키지가
 * 만든 NotionAPI 클라이언트를 그대로 쓴다. 한 프로세스가 사이트 수백 개를 그리는
 * 쪽은 사이트마다 캐시 네임스페이스가 달라야 하고 Notion 토큰도 다를 수 있어서,
 * 그때는 요청마다 자기 것을 넘긴다.
 *
 * @see packages/core/README.md
 */
export interface CoreCacheStore {
  get(key: string): Promise<any>
  set(key: string, value: any, ttl?: number): Promise<any>
}

export interface CoreDeps {
  store?: CoreCacheStore
  notion?: NotionAPI
}
