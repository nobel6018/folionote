import ky from 'ky'
import lqip from 'lqip-modern'
import {
  type ExtendedRecordMap,
  type PreviewImage,
  type PreviewImageMap
} from 'notion-types'
import { getPageImageUrls, normalizeUrl } from 'notion-utils'
import pMap from 'p-map'
import pMemoize from 'p-memoize'

import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'
import { createMapImageUrl } from '../shared/map-image-url.js'
import { getDb } from './db.js'
import { type CoreDeps } from './deps.js'

export async function getPreviewImageMap(
  config: ResolvedSiteConfig,
  recordMap: ExtendedRecordMap,
  deps?: CoreDeps
): Promise<PreviewImageMap> {
  const urls: string[] = getPageImageUrls(recordMap, {
    mapImageUrl: createMapImageUrl(config)
  })
    .concat(
      [config.defaultPageIcon, config.defaultPageCover].filter(
        Boolean
      ) as string[]
    )
    .filter(Boolean)

  const previewImagesMap = Object.fromEntries(
    await pMap(
      urls,
      async (url) => {
        const cacheKey = normalizeUrl(url)
        return [
          cacheKey,
          await getPreviewImage(config, url, { cacheKey }, deps)
        ]
      },
      {
        concurrency: 8
      }
    )
  )

  return previewImagesMap
}

async function createPreviewImage(
  config: ResolvedSiteConfig,
  url: string,
  { cacheKey }: { cacheKey: string },
  deps?: CoreDeps
): Promise<PreviewImage | null> {
  const db = getDb(config, deps)

  try {
    try {
      const cachedPreviewImage = await db.get(cacheKey)
      if (cachedPreviewImage) {
        return cachedPreviewImage
      }
    } catch (err: any) {
      // ignore redis errors
      console.warn(`redis error get "${cacheKey}"`, err.message)
    }

    const body = await ky(url).arrayBuffer()
    const result = await lqip(body)
    console.log('lqip', { ...result.metadata, url, cacheKey })

    const previewImage = {
      originalWidth: result.metadata.originalWidth,
      originalHeight: result.metadata.originalHeight,
      dataURIBase64: result.metadata.dataURIBase64
    }

    try {
      await db.set(cacheKey, previewImage)
    } catch (err: any) {
      // ignore redis errors
      console.warn(`redis error set "${cacheKey}"`, err.message)
    }

    return previewImage
  } catch (err: any) {
    console.warn('failed to create preview image', url, err.message)
    return null
  }
}

/**
 * 캐시 키에 사이트 루트 페이지 ID를 섞는다. 한 프로세스가 사이트 여러 개를 그릴 때
 * URL만으로 키를 잡으면 서로 다른 사이트가 같은 항목을 나눠 쓰게 된다.
 */
export const getPreviewImage = pMemoize(createPreviewImage, {
  cacheKey: ([config, url]) => `${config.rootNotionPageId}:${url}`
})
