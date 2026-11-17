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
import { NOTION_FETCH_USER_AGENT } from './notion-api.js'

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
        // 이미지마다 원본 전체를 받아 sharp로 디코딩한다. 컬렉션 페이지는 한 번에 170장이
        // 넘어서, 많이 겹치면 메모리가 1GB를 넘는다. 3개면 속도는 거의 그대로다
        // (로컬 측정, 174장 기준 8개와 3개 모두 약 19초).
        concurrency: 3
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

    // 이미지 대부분이 `www.notion.so/image/...` 프록시를 거친다. UA가 없으면 Notion이
    // 403(HTML 차단 화면)을 주고, Notion 이미지의 흐린 미리보기가 전부 빠진다
    const body = await ky(url, {
      headers: { 'user-agent': NOTION_FETCH_USER_AGENT }
    }).arrayBuffer()
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
