/**
 * 이 리포에 담긴 사이트 하나를 읽어 최종 설정으로 만든다. **서버 전용이다.**
 *
 * `site.config.ts`를 import하는 파일은 이 파일 하나뿐이다. 나머지 `lib/`과
 * `components/`는 설정을 값으로 받는다. 나중에 `packages/core`와
 * `apps/self-host`로 가를 때 이 파일만 앱 쪽에 남기면 되도록 경계를 여기서 끊는다.
 *
 * 브라우저 번들에 들어가면 안 된다. 들어가는 순간 사이트 이름과 도메인이 JS에
 * 박혀서, 호스팅 서비스가 한 프로세스로 사이트 여러 개를 그릴 수 없게 된다.
 *
 * @see docs/architecture.md
 */
import rawSiteConfig from '../site.config'
import { type SiteConfig } from './site-config'
import {
  type ResolvedSiteConfig,
  resolveSiteConfig
} from './site-config-resolve'

if (!rawSiteConfig) {
  throw new Error(`Config error: invalid site.config.ts`)
}

/**
 * 파일 전체를 JSON으로 덮어쓰는 탈출구. 배포마다 다른 설정을 넣고 싶을 때 쓴다.
 * 파일 값 위에 얕게 병합된다.
 */
function readConfigOverrides(): SiteConfig | undefined {
  const raw = process.env.NEXT_PUBLIC_SITE_CONFIG
  if (!raw) {
    return undefined
  }

  try {
    return JSON.parse(raw) as SiteConfig
  } catch (err) {
    console.error('Invalid config "NEXT_PUBLIC_SITE_CONFIG" failed to parse')
    throw err
  }
}

let cached: ResolvedSiteConfig | undefined

/**
 * 프로세스당 한 번만 계산한다. 요청마다 다시 만들면 폰트 정규화와 URL 맵 검증을
 * 매번 반복하게 되고, `pMemoize` 캐시 키로 쓰는 객체 동일성도 깨진다.
 */
export function loadSiteConfig(): ResolvedSiteConfig {
  if (cached) {
    return cached
  }

  const input: SiteConfig = {
    ...rawSiteConfig,
    ...readConfigOverrides()
  }

  cached = resolveSiteConfig(input, {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    NOTION_ROOT_PAGE_ID: process.env.NOTION_ROOT_PAGE_ID,
    SITE_NAME: process.env.SITE_NAME,
    SITE_AUTHOR: process.env.SITE_AUTHOR,
    SITE_DOMAIN: process.env.SITE_DOMAIN,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    REDIS_ENABLED: process.env.REDIS_ENABLED
  })

  return cached
}
