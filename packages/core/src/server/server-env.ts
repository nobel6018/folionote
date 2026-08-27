/**
 * 사이트가 아니라 **프로세스**에 붙는 설정. 서버 전용이다.
 *
 * Redis는 사이트마다 다른 값이 아니라 이 프로세스가 붙는 저장소 하나다. 그래서
 * `site.config.ts`가 아니라 환경변수에서 읽고, `ResolvedSiteConfig`에도 담지
 * 않는다(담으면 접속 정보가 `__NEXT_DATA__`를 타고 브라우저까지 나간다).
 *
 * 켤지 말지만 사이트 설정(`isRedisEnabled`)이 정하고, 어디에 붙을지는 여기가 정한다.
 *
 * @see docs/architecture.md
 */

function getEnv<T>(key: string, defaultValue?: string | T): string | T {
  const value = process.env[key]

  if (value !== undefined) {
    return value
  }

  if (defaultValue !== undefined) {
    return defaultValue
  }

  throw new Error(`Config error: missing required env variable "${key}"`)
}

export interface RedisSettings {
  url: string | null
  namespace: string
}

const cache = new Map<boolean, RedisSettings>()

/**
 * Redis 접속 정보. 켜져 있는데 REDIS_HOST나 REDIS_PASSWORD가 없으면 던진다.
 * 조용히 인메모리로 떨어지면 캐시가 도는 줄 알고 넘어가게 된다.
 */
export function getRedisSettings(isRedisEnabled: boolean): RedisSettings {
  const cached = cache.get(isRedisEnabled)
  if (cached) {
    return cached
  }

  const host = getEnv('REDIS_HOST', isRedisEnabled ? undefined : null)
  const password = getEnv('REDIS_PASSWORD', isRedisEnabled ? undefined : null)
  const user: string = getEnv('REDIS_USER', 'default')

  const settings: RedisSettings = {
    url: getEnv(
      'REDIS_URL',
      isRedisEnabled ? `redis://${user}:${password}@${host}` : null
    ),
    namespace: getEnv('REDIS_NAMESPACE', 'preview-images')
  }

  cache.set(isRedisEnabled, settings)
  return settings
}

/** 프로덕션 배포에서만 크롤러를 허용한다 (@see pages/robots.txt.tsx) */
export function isProductionDeployment(): boolean {
  return process.env.VERCEL_ENV === 'production'
}
