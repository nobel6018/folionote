import { type ParsedUrlQuery } from 'node:querystring'

import { type ExtendedRecordMap, type PageMap } from 'notion-types'

import { type ResolvedSiteConfig } from './config/site-config-resolve.js'

export * from 'notion-types'

export type NavigationStyle = 'default' | 'custom'

/**
 * 사용자가 스스로 고칠 수 있는 실패 종류. 안내 화면이 이 값으로 문구를 고른다.
 * (@see lib/notion-errors.ts, components/Page404.tsx)
 */
export type PageErrorKind =
  | 'unpublished'
  | 'not-found'
  | 'invalid-id'
  | 'rate-limited'

export interface PageError {
  message?: string
  statusCode: number
  kind?: PageErrorKind
}

export interface PageProps {
  /**
   * 이 요청이 그릴 사이트의 최종 설정. 브라우저까지 그대로 실려 간다
   * (@see lib/site-config-context.tsx).
   */
  config: ResolvedSiteConfig
  /** 설정에서 파생되는 값이라 `config.site`와 같다. react-notion-x 쪽 호환용으로 남긴다 */
  site?: Site
  recordMap?: ExtendedRecordMap
  pageId?: string
  error?: PageError
}

export interface ExtendedTweetRecordMap extends ExtendedRecordMap {
  tweets: Record<string, any>
}

export interface Params extends ParsedUrlQuery {
  pageId: string
}

export interface Site {
  name: string
  domain: string

  rootNotionPageId: string
  rootNotionSpaceId: string | null

  // settings
  html?: string
  fontFamily?: string
  darkMode?: boolean
  previewImages?: boolean

  // opengraph metadata
  description?: string
  image?: string
}

export interface SiteMap {
  site: Site
  pageMap: PageMap
  canonicalPageMap: CanonicalPageMap
}

export interface CanonicalPageMap {
  [canonicalPageId: string]: string
}

export interface PageUrlOverridesMap {
  // maps from a URL path to the notion page id the page should be resolved to
  // (this overrides the built-in URL path generation for these pages)
  [pagePath: string]: string
}

export interface PageUrlOverridesInverseMap {
  // maps from a notion page id to the URL path the page should be resolved to
  // (this overrides the built-in URL path generation for these pages)
  [pageId: string]: string
}

export interface NotionPageInfo {
  pageId: string
  title: string
  image?: string
  imageObjectPosition?: string
  author?: string
  authorImage?: string
  detail?: string
}
