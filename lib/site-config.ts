import type * as types from './types'

export interface SiteConfig {
  rootNotionPageId: string
  rootNotionSpaceId?: string | null

  name: string
  domain: string
  author: string
  description?: string
  language?: string

  twitter?: string
  github?: string
  linkedin?: string
  newsletter?: string
  youtube?: string
  zhihu?: string
  mastodon?: string

  defaultPageIcon?: string | null
  defaultPageCover?: string | null
  defaultPageCoverPosition?: number | null

  isPreviewImageSupportEnabled?: boolean
  isTweetEmbedSupportEnabled?: boolean
  isRedisEnabled?: boolean
  isSearchEnabled?: boolean

  includeNotionIdInUrls?: boolean
  pageUrlOverrides?: types.PageUrlOverridesMap | null
  pageUrlAdditions?: types.PageUrlOverridesMap | null

  navigationStyle?: types.NavigationStyle
  navigationLinks?: Array<NavigationLink>
  logo?: SiteLogo

  /**
   * 컬렉션 카드/페이지의 날짜 표시 형식. Notion은 date 속성의 표시 형식을
   * API로 내려주지 않으므로(스키마에 `date_format`이 없다) 사이트 단위로 지정한다.
   *
   * 지원 토큰: `YYYY` `MM` `DD` `M` `D` `MMM`(영문 월 약어) `MMMM`(영문 월 전체)
   * 예) `'YYYY/MM/DD'` → 2026/07/04, `'MMM D, YYYY'` → Jul 4, 2026
   */
  dateFormat?: string

  /** 컬렉션 뷰가 여러 개일 때 헤더에 뷰 전환 탭 노출 여부 */
  isCollectionViewTabsEnabled?: boolean

  /** 컬렉션 안에서 카드를 걸러내는 검색 노출 여부 */
  isCollectionSearchEnabled?: boolean

  colorTheme?: ColorTheme

  /** 헤더/모바일 드로어에 현재 페이지 공유 버튼 노출 여부 */
  isShareButtonEnabled?: boolean
}

export interface NavigationLink {
  title: string
  pageId?: string
  url?: string
}

/**
 * 사이트 색상 테마. 레퍼런스 서비스 어드민의 "색상 테마"(라이트 / 다크 / 커스텀)에 대응.
 *
 * - `system`(기본): OS 설정을 따르고 헤더에 테마 토글을 노출한다
 * - `light` / `dark`: 한쪽으로 고정하고 토글을 감춘다
 * - `custom`: 배경/글자색을 직접 지정한다. 토글은 감춘다
 */
export interface ColorTheme {
  mode?: 'system' | 'light' | 'dark' | 'custom'
  /** `custom` 모드의 배경색 */
  background?: string
  /** `custom` 모드의 본문 글자색 */
  foreground?: string
}

/**
 * 헤더 좌측 로고. 문자열 하나만 주면 라이트/다크에 같은 이미지를 쓴다.
 * 지정하지 않으면 사이트 이름(`name`)을 텍스트로 노출한다.
 */
export type SiteLogo =
  | string
  | {
      /** 라이트 테마 이미지 경로 (`public/` 기준 또는 절대 URL) */
      light: string
      /** 다크 테마 이미지. 없으면 light를 그대로 쓴다 */
      dark?: string
      /** 이미지 높이(px). 폭은 비율에 맞춰 자동. 레퍼런스 서비스 어드민의 "로고 크기" */
      height?: number
      /** 클릭 시 이동 경로. 기본 `/` */
      href?: string
      /** 대체 텍스트. 기본값은 사이트 이름 */
      alt?: string
    }

export const siteConfig = (config: SiteConfig): SiteConfig => {
  return config
}
