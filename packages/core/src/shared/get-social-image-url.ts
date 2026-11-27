import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'

/**
 * 소셜 이미지는 1년 immutable 캐시로 나가고, 메신저(카카오톡 등)도 이미지 주소로
 * 캐시한다. 그래서 페이지를 고쳐도 주소가 같으면 옛 그림이 남는다. 페이지의 수정
 * 시각을 `v`로 붙여 페이지가 바뀌면 주소도 바뀌게 한다.
 */
export function getSocialImageUrl(
  config: ResolvedSiteConfig,
  pageId: string | undefined,
  version?: number | string
) {
  try {
    const url = new URL(config.api.getSocialImage, config.host)

    if (pageId) {
      url.searchParams.set('id', pageId)
      if (version) {
        url.searchParams.set('v', String(version))
      }
      return url.toString()
    }
  } catch (err: any) {
    console.warn('error invalid social image url', pageId, err.message)
  }

  return null
}
