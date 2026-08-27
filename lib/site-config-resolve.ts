/**
 * `site.config.ts`의 원본 값과 환경변수를 받아 렌더러가 쓰는 최종 설정 객체를 만든다.
 *
 * 순수 함수다. `process.env`도 `site.config.ts`도 여기서 읽지 않는다. 그래야 한
 * 프로세스가 사이트 여러 개를 그릴 수 있다. 모듈 최상단에서 값을 계산하던 예전
 * 구조(`lib/config.ts`)는 프로세스당 사이트 하나로 고정돼 있었다.
 *
 * 결과는 JSON으로 직렬화되는 평범한 객체여야 한다. `getStaticProps`가 이 값을
 * `PageProps.config`로 실어 브라우저까지 보내기 때문이다. 함수나 클래스를 담으면
 * 직렬화에서 죽는다.
 *
 * @see docs/architecture.md
 */
import { parsePageId } from 'notion-utils'

import { quoteFamily, resolveFont } from './fonts'
import {
  type BackToTopConfig,
  type BottomNavigationConfig,
  type BottomNavigationLink,
  type ColorTheme,
  type CtaConfig,
  type CustomCodeConfig,
  type FontConfig,
  type NavigationLink,
  type PageMetaOverride,
  type PageViewCountConfig,
  type PopupConfig,
  type PopupOptions,
  type ScrollProgressBarConfig,
  type SiteConfig,
  type SiteLogo
} from './site-config'
import {
  type NavigationStyle,
  type PageUrlOverridesInverseMap,
  type PageUrlOverridesMap,
  type Site
} from './types'

/**
 * `site.config.ts`에 값이 없을 때 대신 볼 환경변수들.
 *
 * Vercel Deploy 버튼은 배포 전에 환경변수 입력 폼을 띄운다. 이 경로가 있으면
 * 리포를 클론해 파일을 고치고 커밋하는 과정 없이 배포 한 번으로 사이트가 뜬다.
 * 파일에 값이 들어오면 그때부터 파일이 이긴다.
 */
export interface ResolveEnv {
  NODE_ENV?: string
  PORT?: string

  NOTION_ROOT_PAGE_ID?: string
  SITE_NAME?: string
  SITE_AUTHOR?: string
  SITE_DOMAIN?: string

  /** Vercel이 넣어주는 프로덕션 도메인. 배포 전에는 도메인을 알 수 없어 이걸 쓴다 */
  VERCEL_PROJECT_PRODUCTION_URL?: string
  /** 배포마다 달라지는 프리뷰 호스트명 */
  VERCEL_URL?: string

  REDIS_ENABLED?: string

  /** 넘기지 않으면 NODE_ENV로 판정한다 */
  isDev?: boolean
}

/** 헤더 좌측 로고를 항상 같은 형태로 정규화한 값 */
export interface ResolvedLogo {
  light: string
  dark: string
  height: number
  href: string
  alt: string
}

export interface ResolvedFont {
  /** 받아야 할 스타일시트 URL들 */
  urls: string[]
  /** 최종 font-family 스택 */
  sans: string
  mono: string | null
}

export interface ResolvedCta {
  text: string
  href: string
  bottomOffset: number
  background: string
  gradient: [string, string] | null
  color: string
  shadowColor: string
  newTab: boolean
}

export interface ResolvedBottomNavigation {
  color: string
  links: BottomNavigationLink[]
}

export interface ResolvedSiteConfig {
  // --- Notion
  rootNotionPageId: string
  rootNotionSpaceId: string | null

  pageUrlOverrides: PageUrlOverridesMap
  pageUrlAdditions: PageUrlOverridesMap
  inversePageUrlOverrides: PageUrlOverridesInverseMap

  // --- 실행 환경
  environment: string
  isDev: boolean

  // --- 사이트 기본 정보
  name: string
  author: string
  domain: string
  description: string
  language: string

  // --- 소셜 계정
  twitter: string | undefined
  mastodon: string | undefined
  /** 마스토돈은 분산형이라 핸들에 인스턴스 도메인이 붙는다 (@example@mastodon.social) */
  mastodonHandle: string | undefined
  github: string | undefined
  youtube: string | undefined
  linkedin: string | undefined
  newsletter: string | undefined
  zhihu: string | undefined

  // --- Notion 기본값
  defaultPageIcon: string | undefined
  defaultPageCover: string | undefined
  defaultPageCoverPosition: number

  // --- 기능 토글
  isPreviewImageSupportEnabled: boolean
  includeNotionIdInUrls: boolean
  isSearchEnabled: boolean
  isCollectionViewTabsEnabled: boolean
  isTableOfContentsEnabled: boolean
  isCollectionSearchEnabled: boolean
  isShareButtonEnabled: boolean
  isThemeToggleEnabled: boolean
  isRedisEnabled: boolean

  // --- 외형
  navigationStyle: NavigationStyle
  navigationLinks: Array<NavigationLink | undefined> | null
  logo: ResolvedLogo | null
  dateFormat: string
  colorThemeMode: NonNullable<ColorTheme['mode']>
  customThemeColors: { background: string; foreground: string } | null
  font: ResolvedFont

  // --- 위젯
  pageViewCount: {
    enabled: boolean
    style: NonNullable<PageViewCountConfig['style']>
    timeZone: string
  }
  bottomNavigation: ResolvedBottomNavigation | null
  popups: PopupConfig[]
  popupOptions: Required<PopupOptions>
  cta: ResolvedCta | null
  scrollProgressBar: Required<ScrollProgressBarConfig>
  backToTop: Required<BackToTopConfig>

  // --- 주입 코드와 페이지별 메타
  customCode: CustomCodeConfig
  pageMeta: Record<string, PageMetaOverride>

  // --- 주소
  host: string
  apiBaseUrl: string
  api: {
    searchNotion: string
    getNotionPageInfo: string
    getSocialImage: string
  }

  site: Site
}

/**
 * 값을 하나 고른다. 파일 → 환경변수 순.
 *
 * 빈 문자열은 없는 값으로 본다. Vercel 입력 폼에서 항목을 비워 두면 빈 값이
 * 들어오는데, 그걸 사이트 이름으로 쓰면 제목 없는 페이지가 나간다.
 */
function pickString(
  fromFile: unknown,
  ...fromEnv: Array<string | undefined>
): string | undefined {
  if (typeof fromFile === 'string' && fromFile.trim()) {
    return fromFile
  }

  for (const value of fromEnv) {
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return undefined
}

/** 없으면 두 경로를 모두 알려주고 실패한다 */
function requireString(
  key: string,
  envKey: string,
  value: string | undefined
): string {
  if (value) {
    return value
  }

  throw new Error(
    `Config error: missing required config "${key}". site.config.ts의 "${key}" 또는 환경변수 ${envKey} 중 하나를 채워야 합니다.`
  )
}

/**
 * `undefined`일 때만 기본값으로 내려간다. `null`은 사용자가 일부러 넣은 값으로 본다.
 * 예전 `getSiteConfig(key, default)`와 같은 규칙이다.
 */
function pick<T>(value: T | undefined, defaultValue: T): T {
  return value === undefined ? defaultValue : value
}

/**
 * `undefined` 값을 가진 키를 지운다.
 *
 * 이 객체는 `getStaticProps`의 반환값에 실려 나가는데, Next는 `undefined`를
 * JSON으로 직렬화하지 못하고 빌드를 세운다. 키를 통째로 빼면 읽을 때 여전히
 * `undefined`가 나오므로 쓰는 쪽 코드는 그대로 둔다.
 */
function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(value)) {
      if (item !== undefined) {
        out[key] = stripUndefined(item)
      }
    }

    return out as T
  }

  return value
}

function cleanPageUrlMap(
  pageUrlMap: PageUrlOverridesMap,
  { label }: { label: string }
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

function resolveMastodonHandle(mastodon: string | undefined) {
  if (!mastodon) {
    return undefined
  }

  const url = new URL(mastodon)
  return `${url.pathname.slice(1)}@${url.hostname}`
}

/**
 * 실제로 받아야 할 폰트 스타일시트와 최종 font-family 스택.
 *
 * 기본값은 Pretendard 한 종이다(한글 + 라틴을 함께 담고 OFL). ko/en/ja를 각각
 * 지정하면 en → ko → ja 순으로 스택을 만들어 글자별로 갈라지게 한다.
 */
function resolveFontConfig(rawFont: FontConfig | null): ResolvedFont {
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
    sans: [
      ...entries.map((e) => quoteFamily(e.family)),
      ...systemFallback
    ].join(', '),
    mono: rawFont?.mono ?? null
  }
}

/**
 * 원본 설정과 환경변수를 합쳐 최종 설정을 만든다.
 *
 * 같은 입력이면 항상 같은 결과가 나온다. 필수값이 비면 여기서 던진다. 실패가
 * 아니라 안내라고 읽으면 된다.
 */
export function resolveSiteConfig(
  input: SiteConfig,
  env: ResolveEnv = {}
): ResolvedSiteConfig {
  const environment = env.NODE_ENV || 'development'
  const isDev = env.isDev ?? environment === 'development'

  /**
   * 루트 페이지 ID. 32자 ID뿐 아니라 Notion 페이지 주소를 통째로 넣어도 된다.
   * parsePageId가 주소 끝의 ID를 뽑아낸다. 환경변수로 받을 때는 브라우저 주소창에서
   * 복사한 URL을 그대로 붙이는 쪽이 자연스러워서 이 경로가 특히 중요하다.
   */
  const rootNotionPageId = parsePageId(
    requireString(
      'rootNotionPageId',
      'NOTION_ROOT_PAGE_ID',
      pickString(input.rootNotionPageId, env.NOTION_ROOT_PAGE_ID)
    ),
    { uuid: false }
  )!

  if (!rootNotionPageId) {
    throw new Error('Config error invalid "rootNotionPageId"')
  }

  const rootNotionSpaceId =
    parsePageId(input.rootNotionSpaceId, { uuid: true }) ?? null

  const pageUrlOverrides = cleanPageUrlMap(input.pageUrlOverrides || {}, {
    label: 'pageUrlOverrides'
  })
  const pageUrlAdditions = cleanPageUrlMap(input.pageUrlAdditions || {}, {
    label: 'pageUrlAdditions'
  })

  const name = requireString(
    'name',
    'SITE_NAME',
    pickString(input.name, env.SITE_NAME)
  )

  /** 작성자. 따로 적지 않으면 사이트 이름을 그대로 쓴다 (RSS, footer 저작권 표기) */
  const author = pickString(input.author, env.SITE_AUTHOR) ?? name

  /**
   * 운영 도메인. canonical URL과 OG 태그에 들어간다.
   *
   * Deploy 버튼으로 배포할 때는 도메인이 배포가 끝나야 정해지므로 미리 물어볼 수가
   * 없다. 그래서 Vercel이 넣어주는 호스트명을 대신 본다. PRODUCTION_URL은 프로덕션
   * 도메인으로 고정이고, VERCEL_URL은 배포마다 달라지는 프리뷰 주소다.
   */
  const domain =
    pickString(
      input.domain,
      env.SITE_DOMAIN,
      env.VERCEL_PROJECT_PRODUCTION_URL,
      env.VERCEL_URL
    ) ?? 'localhost:3000'

  const description = pick(input.description, 'Notion Blog')
  const language = pick(input.language, 'en')

  const rawLogo: SiteLogo | null = pick(input.logo, null)

  /**
   * 로고 지정이 없으면 null이고, 이때 헤더는 사이트 이름 텍스트로 대체한다.
   */
  const logo: ResolvedLogo | null = rawLogo
    ? {
        light: typeof rawLogo === 'string' ? rawLogo : rawLogo.light,
        dark:
          typeof rawLogo === 'string'
            ? rawLogo
            : (rawLogo.dark ?? rawLogo.light),
        height:
          (typeof rawLogo === 'string' ? undefined : rawLogo.height) ?? 20,
        href: (typeof rawLogo === 'string' ? undefined : rawLogo.href) ?? '/',
        alt: (typeof rawLogo === 'string' ? undefined : rawLogo.alt) ?? name
      }
    : null

  const rawColorTheme: ColorTheme | null = pick(input.colorTheme, null)
  const colorThemeMode = rawColorTheme?.mode ?? 'system'

  /** custom 모드에서 주입할 색. 다른 모드에서는 null */
  const customThemeColors =
    colorThemeMode === 'custom'
      ? {
          background: rawColorTheme?.background || '#ffffff',
          foreground: rawColorTheme?.foreground || '#37352f'
        }
      : null

  const rawPageViewCount: PageViewCountConfig | null = pick(
    input.pageViewCount,
    null
  )
  const rawBottomNav: BottomNavigationConfig | null = pick(
    input.bottomNavigation,
    null
  )
  const rawPopups: PopupConfig[] | null = pick(input.popups, null)
  const rawPopupOptions: PopupOptions | null = pick(input.popupOptions, null)
  const rawCta: CtaConfig | null = pick(input.cta, null)
  const rawScrollProgressBar: ScrollProgressBarConfig | null = pick(
    input.scrollProgressBar,
    null
  )
  const rawBackToTop: BackToTopConfig | null = pick(input.backToTop, null)

  /** 하단 탭바. 링크가 하나도 없으면 바 자체를 그리지 않는다 */
  const bottomNavigation: ResolvedBottomNavigation | null = (() => {
    if (!rawBottomNav || rawBottomNav.enabled === false) {
      return null
    }

    const links = (rawBottomNav.links || []).filter(
      (link) => link?.title && (link.url || link.pageId)
    )

    return links.length
      ? { color: rawBottomNav.color ?? '#53a1c9', links }
      : null
  })()

  const mastodon = input.mastodon
  const apiBaseUrl = `/api`
  const host = isDev
    ? `http://localhost:${env.PORT ?? '3000'}`
    : `https://${domain}`

  return stripUndefined({
    rootNotionPageId,
    rootNotionSpaceId,
    pageUrlOverrides,
    pageUrlAdditions,
    inversePageUrlOverrides: invertPageUrlOverrides(pageUrlOverrides),

    environment,
    isDev,

    name,
    author,
    domain,
    description,
    language,

    twitter: input.twitter,
    mastodon,
    mastodonHandle: resolveMastodonHandle(mastodon),
    github: input.github,
    youtube: input.youtube,
    linkedin: input.linkedin,
    newsletter: input.newsletter,
    zhihu: input.zhihu,

    // 타입은 string | undefined지만 site.config.ts에 null을 적는 사람이 있어
    // 런타임 값은 그대로 둔다. 예전 lib/config.ts와 같은 동작이다.
    defaultPageIcon: input.defaultPageIcon as string | undefined,
    defaultPageCover: input.defaultPageCover as string | undefined,
    defaultPageCoverPosition: pick(
      input.defaultPageCoverPosition,
      0.5
    ) as number,

    isPreviewImageSupportEnabled: pick(
      input.isPreviewImageSupportEnabled,
      false
    ),
    // UUID를 붙여두면 로컬에서 디버깅이 쉽고 canonical 조회도 건너뛴다
    includeNotionIdInUrls: pick(input.includeNotionIdInUrls, !!isDev),
    isSearchEnabled: pick(input.isSearchEnabled, true),
    isCollectionViewTabsEnabled: pick(input.isCollectionViewTabsEnabled, true),
    // 글 옆 목차. 레퍼런스 서비스는 띄우지 않아서 기본을 꺼짐으로 둔다
    isTableOfContentsEnabled: pick(input.isTableOfContentsEnabled, false),
    isCollectionSearchEnabled: pick(input.isCollectionSearchEnabled, true),
    isShareButtonEnabled: pick(input.isShareButtonEnabled, true),
    /**
     * 테마 토글 노출 여부. system 모드에서만 의미가 있다
     * (한쪽으로 고정했거나 커스텀 색을 쓰면 토글이 색을 뒤엎어 버린다).
     */
    isThemeToggleEnabled: colorThemeMode === 'system',
    isRedisEnabled: pick(input.isRedisEnabled, false) || !!env.REDIS_ENABLED,

    navigationStyle: pick(input.navigationStyle, 'default'),
    navigationLinks: pick(input.navigationLinks, null),
    logo,
    // 날짜 표시 형식 (@see lib/format-date.ts)
    dateFormat: pick(input.dateFormat, 'YYYY/MM/DD'),
    colorThemeMode,
    customThemeColors,
    font: resolveFontConfig(pick(input.font, null)),

    /**
     * 페이지뷰 카운트. 기본은 꺼짐이다. Redis 없이는 셀 수 없어서
     * (@see lib/pageview-store.ts) 켜려면 REDIS_* 환경변수까지 설정해야 한다.
     */
    pageViewCount: {
      enabled: rawPageViewCount?.enabled ?? false,
      style: rawPageViewCount?.style ?? 'inline',
      // "오늘"을 어느 타임존으로 볼지. UTC로 두면 한국 사이트에서 오전 9시에 날짜가 바뀐다
      timeZone: rawPageViewCount?.timeZone ?? 'UTC'
    },
    bottomNavigation,
    /** 팝업. id가 없거나 보여줄 내용이 하나도 없는 항목은 버린다 */
    popups: (rawPopups || []).filter(
      (popup) => popup?.id && (popup.title || popup.body || popup.image)
    ),
    popupOptions: {
      mainPageOnly: rawPopupOptions?.mainPageOnly ?? false
    },
    /** CTA 버튼. 설정이 없거나 enabled: false거나 문구/링크가 비면 null */
    cta:
      rawCta && rawCta.enabled !== false && rawCta.text && rawCta.href
        ? {
            text: rawCta.text,
            href: rawCta.href,
            bottomOffset: rawCta.bottomOffset ?? 16,
            background: rawCta.background ?? '#ffffff',
            gradient: rawCta.gradient ?? null,
            color: rawCta.color ?? '#000000',
            shadowColor: rawCta.shadowColor ?? 'rgba(55, 53, 47, 0.25)',
            newTab: rawCta.newTab ?? false
          }
        : null,
    scrollProgressBar: {
      enabled: rawScrollProgressBar?.enabled ?? true,
      // 레퍼런스 서비스 어드민 기본값
      color: rawScrollProgressBar?.color ?? '#007fb8'
    },
    backToTop: {
      enabled: rawBackToTop?.enabled ?? true,
      position: rawBackToTop?.position ?? 'right',
      fitToContent: rawBackToTop?.fitToContent ?? true,
      sideOffset: rawBackToTop?.sideOffset ?? 0,
      bottomOffset: rawBackToTop?.bottomOffset ?? 16,
      showAfter: rawBackToTop?.showAfter ?? 400
    },

    /**
     * 사용자 코드 주입. 비어 있으면 아무것도 렌더하지 않는다.
     * @see docs/custom-code.md
     */
    customCode: pick(input.customCode, {}) ?? {},
    /**
     * 페이지별 SEO 메타 덮어쓰기. 키는 하이픈 없는 32자 페이지 ID다.
     * @see lib/page-meta.ts
     */
    pageMeta: pick(input.pageMeta, {}) ?? {},

    host,
    apiBaseUrl,
    api: {
      searchNotion: `${apiBaseUrl}/search-notion`,
      getNotionPageInfo: `${apiBaseUrl}/notion-page-info`,
      getSocialImage: `${apiBaseUrl}/social-image`
    },

    site: {
      domain,
      name,
      rootNotionPageId,
      rootNotionSpaceId,
      description
    }
  })
}
