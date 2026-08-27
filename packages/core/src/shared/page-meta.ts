import { type PageMetaOverride } from '../config/site-config.js'
import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'

/**
 * 페이지별 SEO 메타 덮어쓰기 조회.
 *
 * 키를 하이픈 없는 32자 소문자 hex로 정규화해서 찾는다. 사용자가 Notion에서
 * 복사한 ID에는 하이픈이 붙어 있기도 하고(`392c0343-b4fa-...`), URL에서 딴 값은
 * 붙어 있지 않다. 어느 쪽을 적어도 찾히게 하지 않으면 "설정했는데 안 먹는다"가 된다.
 *
 * @see lib/site-config.ts
 * @see docs/custom-code.md
 */

function normalize(pageId: string | undefined | null): string {
  return (pageId || '').replaceAll('-', '').toLowerCase()
}

/**
 * 정규화된 키로 다시 만든 맵. 매 호출마다 순회하지 않도록 설정 객체당 한 번만 만든다.
 * WeakMap이라 설정이 버려지면 같이 사라진다.
 */
const normalizedCache = new WeakMap<
  ResolvedSiteConfig,
  Record<string, PageMetaOverride>
>()

function getNormalizedPageMeta(
  config: ResolvedSiteConfig
): Record<string, PageMetaOverride> {
  let normalized = normalizedCache.get(config)

  if (!normalized) {
    normalized = Object.fromEntries(
      Object.entries(config.pageMeta).map(([key, value]) => [
        normalize(key),
        value
      ])
    )
    normalizedCache.set(config, normalized)
  }

  return normalized
}

export function getPageMetaOverride(
  config: ResolvedSiteConfig,
  pageId: string | undefined | null
): PageMetaOverride | undefined {
  const key = normalize(pageId)
  return key ? getNormalizedPageMeta(config)[key] : undefined
}

/** 사이트맵에서 빼야 하는 페이지인지 */
export function isNoindexPage(
  config: ResolvedSiteConfig,
  pageId: string | undefined | null
): boolean {
  return getPageMetaOverride(config, pageId)?.noindex === true
}
