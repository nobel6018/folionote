import { type ResolvedSiteConfig } from './site-config-resolve'

export function getSocialImageUrl(
  config: ResolvedSiteConfig,
  pageId: string | undefined
) {
  try {
    const url = new URL(config.api.getSocialImage, config.host)

    if (pageId) {
      url.searchParams.set('id', pageId)
      return url.toString()
    }
  } catch (err: any) {
    console.warn('error invalid social image url', pageId, err.message)
  }

  return null
}
