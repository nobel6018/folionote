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
}

export interface NavigationLink {
  title: string
  pageId?: string
  url?: string
}

export const siteConfig = (config: SiteConfig): SiteConfig => {
  return config
}
