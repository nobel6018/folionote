import Keyv from '@keyvhq/core'
import KeyvRedis from '@keyvhq/redis'

import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'
import { type CoreCacheStore, type CoreDeps } from './deps.js'
import { getRedisSettings } from './server-env.js'

/**
 * 프리뷰 이미지와 URI→pageId 매핑을 담아 두는 캐시.
 *
 * Redis를 끄면 인메모리 Keyv로 떨어진다. 서버리스에서는 인스턴스마다 따로 살고
 * 재시작하면 사라지지만, 워밍된 인스턴스 안에서 같은 페이지를 다시 그릴 때는
 * 그것만으로도 값이 있다.
 *
 * 설정을 인자로 받는다. 한 프로세스가 사이트 여러 개를 그릴 수 있어야 해서
 * 모듈 상수로 두지 않았다. 실제 연결은 Redis 사용 여부당 하나만 만든다.
 *
 * `deps.store`를 넘기면 그것을 그대로 쓴다. 호스팅 서비스는 사이트마다 키가 섞이지
 * 않게 자기 캐시를 끼운다 (@see packages/core/src/server/deps.ts).
 */
const instances = new Map<boolean, Keyv>()

export function getDb(
  config: ResolvedSiteConfig,
  deps?: CoreDeps
): CoreCacheStore {
  if (deps?.store) {
    return deps.store
  }

  const { isRedisEnabled } = config

  let db = instances.get(isRedisEnabled)
  if (db) {
    return db
  }

  if (isRedisEnabled) {
    const { url, namespace } = getRedisSettings(true)
    db = new Keyv({
      store: new KeyvRedis(url!),
      namespace: namespace || undefined
    })
  } else {
    db = new Keyv()
  }

  instances.set(isRedisEnabled, db)
  return db
}
