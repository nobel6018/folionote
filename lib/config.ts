/**
 * Site-wide app configuration.
 *
 * This file pulls from the root "site.config.ts" as well as environment variables
 * for optional depenencies.
 */
import { parsePageId } from 'notion-utils'
import { type PostHogConfig } from 'posthog-js'

import { quoteFamily, resolveFont } from './fonts'
import {
  getEnv,
  getRequiredSiteConfig,
  getSiteConfig
} from './get-config-value'
import {
  type BackToTopConfig,
  type ColorTheme,
  type FontConfig,
  type NavigationLink,
  type ScrollProgressBarConfig,
  type SiteLogo
} from './site-config'
import {
  type NavigationStyle,
  type PageUrlOverridesInverseMap,
  type PageUrlOverridesMap,
  type Site
} from './types'

export const rootNotionPageId: string = parsePageId(
  getSiteConfig('rootNotionPageId'),
  { uuid: false }
)!

if (!rootNotionPageId) {
  throw new Error('Config error invalid "rootNotionPageId"')
}

// if you want to restrict pages to a single notion workspace (optional)
export const rootNotionSpaceId: string | null =
  parsePageId(getSiteConfig('rootNotionSpaceId'), { uuid: true }) ?? null

export const pageUrlOverrides = cleanPageUrlMap(
  getSiteConfig('pageUrlOverrides', {}) || {},
  { label: 'pageUrlOverrides' }
)

export const pageUrlAdditions = cleanPageUrlMap(
  getSiteConfig('pageUrlAdditions', {}) || {},
  { label: 'pageUrlAdditions' }
)

export const inversePageUrlOverrides = invertPageUrlOverrides(pageUrlOverrides)

export const environment = process.env.NODE_ENV || 'development'
export const isDev = environment === 'development'

// general site config
export const name: string = getRequiredSiteConfig('name')
export const author: string = getRequiredSiteConfig('author')
export const domain: string = getRequiredSiteConfig('domain')
export const description: string = getSiteConfig('description', 'Notion Blog')
export const language: string = getSiteConfig('language', 'en')

// social accounts
export const twitter: string | undefined = getSiteConfig('twitter')
export const mastodon: string | undefined = getSiteConfig('mastodon')
export const github: string | undefined = getSiteConfig('github')
export const youtube: string | undefined = getSiteConfig('youtube')
export const linkedin: string | undefined = getSiteConfig('linkedin')
export const newsletter: string | undefined = getSiteConfig('newsletter')
export const zhihu: string | undefined = getSiteConfig('zhihu')

export const getMastodonHandle = (): string | undefined => {
  if (!mastodon) {
    return
  }

  // Since Mastodon is decentralized, handles include the instance domain name.
  // e.g. @example@mastodon.social
  const url = new URL(mastodon)
  return `${url.pathname.slice(1)}@${url.hostname}`
}

// default notion values for site-wide consistency (optional; may be overridden on a per-page basis)
export const defaultPageIcon: string | undefined =
  getSiteConfig('defaultPageIcon')
export const defaultPageCover: string | undefined =
  getSiteConfig('defaultPageCover')
export const defaultPageCoverPosition: number = getSiteConfig(
  'defaultPageCoverPosition',
  0.5
)

// Optional whether or not to enable support for LQIP preview images
export const isPreviewImageSupportEnabled: boolean = getSiteConfig(
  'isPreviewImageSupportEnabled',
  false
)

// Optional whether or not to include the Notion ID in page URLs or just use slugs
export const includeNotionIdInUrls: boolean = getSiteConfig(
  'includeNotionIdInUrls',
  !!isDev
)

export const navigationStyle: NavigationStyle = getSiteConfig(
  'navigationStyle',
  'default'
)

export const navigationLinks: Array<NavigationLink | undefined> = getSiteConfig(
  'navigationLinks',
  null
)

const rawLogo: SiteLogo | null = getSiteConfig('logo', null)

/**
 * 헤더 로고를 항상 같은 형태로 정규화한다. 지정이 없으면 null이고,
 * 이때 헤더는 사이트 이름 텍스트로 대체한다.
 */
export const logo: {
  light: string
  dark: string
  height: number
  href: string
  alt: string
} | null = rawLogo
  ? {
      light: typeof rawLogo === 'string' ? rawLogo : rawLogo.light,
      dark:
        typeof rawLogo === 'string'
          ? rawLogo
          : (rawLogo.dark ?? rawLogo.light),
      height: (typeof rawLogo === 'string' ? undefined : rawLogo.height) ?? 20,
      href: (typeof rawLogo === 'string' ? undefined : rawLogo.href) ?? '/',
      alt: (typeof rawLogo === 'string' ? undefined : rawLogo.alt) ?? name
    }
  : null

// Optional site search
export const isSearchEnabled: boolean = getSiteConfig('isSearchEnabled', true)

// 날짜 표시 형식 (@see lib/format-date.ts)
export const dateFormat: string = getSiteConfig('dateFormat', 'YYYY/MM/DD')

export const isCollectionViewTabsEnabled: boolean = getSiteConfig(
  'isCollectionViewTabsEnabled',
  true
)

// 컬렉션 내 검색 (레퍼런스 서비스 어드민의 "검색 기능 숨기기"에 대응)
export const isCollectionSearchEnabled: boolean = getSiteConfig(
  'isCollectionSearchEnabled',
  true
)

const rawColorTheme: ColorTheme | null = getSiteConfig('colorTheme', null)

export const colorThemeMode: NonNullable<ColorTheme['mode']> =
  rawColorTheme?.mode ?? 'system'

/** custom 모드에서 주입할 색. 다른 모드에서는 null */
export const customThemeColors: {
  background: string
  foreground: string
} | null =
  colorThemeMode === 'custom'
    ? {
        background: rawColorTheme?.background || '#ffffff',
        foreground: rawColorTheme?.foreground || '#37352f'
      }
    : null

// 공유 버튼 (레퍼런스 서비스 어드민의 "공유 버튼 표시")
export const isShareButtonEnabled: boolean = getSiteConfig(
  'isShareButtonEnabled',
  true
)

const rawFont: FontConfig | null = getSiteConfig('font', null)

/**
 * 실제로 받아야 할 폰트 스타일시트와 최종 font-family 스택.
 *
 * 기본값은 Pretendard 한 종이다(한글 + 라틴을 함께 담고 OFL). ko/en/ja를 각각
 * 지정하면 en → ko → ja 순으로 스택을 만들어 글자별로 갈라지게 한다.
 */
export const font = (() => {
  const choices = [rawFont?.en, rawFont?.ko, rawFont?.ja].filter(Boolean)
  const entries = (choices.length ? choices : ['pretendard']).map((choice) =>
    resolveFont(choice!)
  )

  // 같은 폰트를 두 번 요청하지 않도록 URL을 중복 제거
  const urls = [...new Set(entries.map((e) => e.url).filter(Boolean))]

  const systemFallback = [
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    "'Segoe UI'",
    "'Apple SD Gothic Neo'",
    'sans-serif'
  ]

  return {
    urls: urls as string[],
    sans: [...entries.map((e) => quoteFamily(e.family)), ...systemFallback].join(
      ', '
    ),
    mono: rawFont?.mono ?? null
  }
})()

const rawScrollProgressBar: ScrollProgressBarConfig | null = getSiteConfig(
  'scrollProgressBar',
  null
)

export const scrollProgressBar = {
  enabled: rawScrollProgressBar?.enabled ?? true,
  // 레퍼런스 서비스 어드민 기본값
  color: rawScrollProgressBar?.color ?? '#007fb8'
}

const rawBackToTop: BackToTopConfig | null = getSiteConfig('backToTop', null)

export const backToTop = {
  enabled: rawBackToTop?.enabled ?? true,
  position: rawBackToTop?.position ?? 'right',
  fitToContent: rawBackToTop?.fitToContent ?? false,
  sideOffset: rawBackToTop?.sideOffset ?? 0,
  bottomOffset: rawBackToTop?.bottomOffset ?? 16,
  showAfter: rawBackToTop?.showAfter ?? 400
}

/**
 * 테마 토글 노출 여부. system 모드에서만 의미가 있다
 * (한쪽으로 고정했거나 커스텀 색을 쓰면 토글이 색을 뒤엎어 버린다).
 */
export const isThemeToggleEnabled: boolean = colorThemeMode === 'system'

// ----------------------------------------------------------------------------

// Optional redis instance for persisting preview images
export const isRedisEnabled: boolean =
  getSiteConfig('isRedisEnabled', false) || !!getEnv('REDIS_ENABLED', null)

// (if you want to enable redis, only REDIS_HOST and REDIS_PASSWORD are required)
// we recommend that you store these in a local `.env` file
export const redisHost = getEnv('REDIS_HOST', isRedisEnabled ? undefined : null)
export const redisPassword = getEnv(
  'REDIS_PASSWORD',
  isRedisEnabled ? undefined : null
)
export const redisUser: string = getEnv('REDIS_USER', 'default')
export const redisUrl = getEnv(
  'REDIS_URL',
  isRedisEnabled ? `redis://${redisUser}:${redisPassword}@${redisHost}` : null
)
export const redisNamespace = getEnv('REDIS_NAMESPACE', 'preview-images')

// ----------------------------------------------------------------------------

export const isServer = typeof window === 'undefined'

export const port = getEnv('PORT', '3000')
export const host = isDev ? `http://localhost:${port}` : `https://${domain}`
export const apiHost = isDev
  ? host
  : `https://${process.env.VERCEL_URL || domain}`

export const apiBaseUrl = `/api`

export const api = {
  searchNotion: `${apiBaseUrl}/search-notion`,
  getNotionPageInfo: `${apiBaseUrl}/notion-page-info`,
  getSocialImage: `${apiBaseUrl}/social-image`
}

// ----------------------------------------------------------------------------

export const site: Site = {
  domain,
  name,
  rootNotionPageId,
  rootNotionSpaceId,
  description
}

export const fathomId = isDev ? undefined : process.env.NEXT_PUBLIC_FATHOM_ID
export const fathomConfig = fathomId
  ? {
      excludedDomains: ['localhost', 'localhost:3000']
    }
  : undefined

export const posthogId = process.env.NEXT_PUBLIC_POSTHOG_ID
export const posthogConfig: Partial<PostHogConfig> = {
  api_host: 'https://app.posthog.com'
}

function cleanPageUrlMap(
  pageUrlMap: PageUrlOverridesMap,
  {
    label
  }: {
    label: string
  }
): PageUrlOverridesMap {
  return Object.keys(pageUrlMap).reduce((acc, uri) => {
    const pageId = pageUrlMap[uri]
    const uuid = parsePageId(pageId, { uuid: false })

    if (!uuid) {
      throw new Error(`Invalid ${label} page id "${pageId}"`)
    }

    if (!uri) {
      throw new Error(`Missing ${label} value for page "${pageId}"`)
    }

    if (!uri.startsWith('/')) {
      throw new Error(
        `Invalid ${label} value for page "${pageId}": value "${uri}" should be a relative URI that starts with "/"`
      )
    }

    const path = uri.slice(1)

    return {
      ...acc,
      [path]: uuid
    }
  }, {})
}

function invertPageUrlOverrides(
  pageUrlOverrides: PageUrlOverridesMap
): PageUrlOverridesInverseMap {
  return Object.keys(pageUrlOverrides).reduce((acc, uri) => {
    const pageId = pageUrlOverrides[uri]!

    return {
      ...acc,
      [pageId]: uri
    }
  }, {})
}
