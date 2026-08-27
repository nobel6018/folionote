import rawSiteConfig from '../site.config'
import { type SiteConfig } from './site-config'

if (!rawSiteConfig) {
  throw new Error(`Config error: invalid site.config.ts`)
}

// allow environment variables to override site.config.ts
let siteConfigOverrides: SiteConfig | undefined

try {
  if (process.env.NEXT_PUBLIC_SITE_CONFIG) {
    siteConfigOverrides = JSON.parse(
      process.env.NEXT_PUBLIC_SITE_CONFIG
    ) as SiteConfig
  }
} catch (err) {
  console.error('Invalid config "NEXT_PUBLIC_SITE_CONFIG" failed to parse')
  throw err
}

const siteConfig: SiteConfig = {
  ...rawSiteConfig,
  ...siteConfigOverrides
}

export function getSiteConfig<T, TDefault>(
  key: string,
  defaultValue?: TDefault
): TDefault extends undefined ? T | undefined : T {
  const value = siteConfig[key as keyof SiteConfig]

  if (value !== undefined) {
    return value as T
  }

  return defaultValue as TDefault extends undefined ? T | undefined : T
}

export function getRequiredSiteConfig<T>(key: string): T {
  const value = siteConfig[key as keyof SiteConfig]

  if (value !== undefined) {
    return value as T
  }

  throw new Error(`Config error: missing required site config value "${key}"`)
}

/**
 * site.config.ts에 없으면 환경변수로 받는 설정들.
 *
 * Vercel Deploy 버튼은 배포 전에 환경변수 입력 폼을 띄운다. 이 경로가 있으면
 * 리포를 클론해 파일을 고치고 커밋하는 과정 없이 배포 한 번으로 사이트가 뜬다.
 * 파일에 값이 들어오면 그때부터 파일이 이긴다. 어드민이 저장하면 site.config.ts에
 * 값이 박히므로, 그 뒤에는 환경변수를 지워도 사이트가 그대로 돈다.
 *
 * `process.env.X` 형태로 하나씩 적은 이유가 있다. 이 값들은 헤더의 사이트 이름이나
 * canonical URL을 그리는 코드를 타고 브라우저 번들에도 들어간다. webpack은 이
 * 리터럴 형태만 빌드 시점에 값으로 치환하므로, `process.env[key]`처럼 동적으로
 * 읽으면 브라우저에서 undefined가 된다. 접두사 없는 이름을 브라우저까지 내보내는
 * 설정은 next.config.js의 `env`에 있다.
 */
const envFallbacks = {
  rootNotionPageId: {
    envKey: 'NOTION_ROOT_PAGE_ID',
    value: process.env.NOTION_ROOT_PAGE_ID
  },
  name: { envKey: 'SITE_NAME', value: process.env.SITE_NAME },
  author: { envKey: 'SITE_AUTHOR', value: process.env.SITE_AUTHOR },
  domain: { envKey: 'SITE_DOMAIN', value: process.env.SITE_DOMAIN }
} as const

export type EnvFallbackKey = keyof typeof envFallbacks

/**
 * 우선순위대로 값을 하나 고른다. site.config.ts → 환경변수 → undefined.
 *
 * 빈 문자열은 없는 값으로 본다. Vercel 입력 폼에서 항목을 비워 두면 빈 값이
 * 들어오는데, 그걸 사이트 이름으로 쓰면 제목 없는 페이지가 나간다.
 */
export function getSiteConfigOrEnv(key: EnvFallbackKey): string | undefined {
  const fromFile = siteConfig[key]

  if (typeof fromFile === 'string' && fromFile.trim()) {
    return fromFile
  }

  const fromEnv = envFallbacks[key].value

  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv
  }

  return undefined
}

/** 없으면 두 경로를 모두 알려주고 실패한다 */
export function getRequiredSiteConfigOrEnv(key: EnvFallbackKey): string {
  const value = getSiteConfigOrEnv(key)

  if (value) {
    return value
  }

  throw new Error(
    `Config error: missing required config "${key}". site.config.ts의 "${key}" 또는 환경변수 ${envFallbacks[key].envKey} 중 하나를 채워야 합니다.`
  )
}

export const isServer = typeof window === 'undefined'

export function getEnv<T>(
  key: string,
  defaultValue?: string | T,
  env = process.env
): string | T {
  const value = env[key]

  if (value !== undefined) {
    return value as string
  }

  if (defaultValue !== undefined) {
    return defaultValue
  }

  if (isServer) {
    throw new Error(`Config error: missing required env variable "${key}"`)
  }

  return null as unknown as T
}
