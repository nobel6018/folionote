import { type ExtendedRecordMap } from 'notion-types'
import { parsePageId } from 'notion-utils'

import type { PageProps } from './types'
import * as acl from './acl'
import { getDb } from './db'
import { getSiteMap } from './get-site-map'
import { getPage } from './notion'
import { classifyNotionError } from './notion-errors'
import { type ResolvedSiteConfig } from './site-config-resolve'

/**
 * 페이지를 읽되, 사용자가 고칠 수 있는 실패는 던지지 않고 안내용 props로 바꾼다.
 *
 * Notion이 비공개이거나 ID가 틀린 경우가 여기 해당한다. 그대로 던지면 루트
 * 페이지는 빌드가 실패하고(정적 생성 대상) 하위 페이지는 이유 없는 500이 된다.
 * 안내 화면을 돌려주면 사이트 주인이 무엇을 고쳐야 하는지 화면에서 바로 본다.
 *
 * 네트워크 오류나 Notion 장애처럼 사용자가 어쩔 수 없는 실패는 그대로 던진다.
 * 그 경우는 잠깐 뒤에 다시 시도하는 것이 맞고, 오류 화면을 캐시하면 안 된다.
 */
async function getPageOrError(
  config: ResolvedSiteConfig,
  pageId: string
): Promise<{ recordMap: ExtendedRecordMap } | { error: PageProps['error'] }> {
  try {
    return { recordMap: await getPage(config, pageId) }
  } catch (err) {
    const known = classifyNotionError(err)
    if (known) {
      console.warn('notion page unavailable', pageId, known.kind)
      return { error: known }
    }
    throw err
  }
}

export async function resolveNotionPage(
  config: ResolvedSiteConfig,
  rawPageId?: string
): Promise<PageProps> {
  const { site, domain, environment } = config
  let pageId: string | undefined
  let recordMap: ExtendedRecordMap

  if (rawPageId && rawPageId !== 'index') {
    pageId = parsePageId(rawPageId)!

    if (!pageId) {
      // check if the site configuration provides an override or a fallback for
      // the page's URI
      const override =
        config.pageUrlOverrides[rawPageId] || config.pageUrlAdditions[rawPageId]

      if (override) {
        pageId = parsePageId(override)!
      }
    }

    const db = getDb(config)
    const useUriToPageIdCache = true
    const cacheKey = `uri-to-page-id:${domain}:${environment}:${rawPageId}`
    // TODO: should we use a TTL for these mappings or make them permanent?
    // const cacheTTL = 8.64e7 // one day in milliseconds
    const cacheTTL = undefined // disable cache TTL

    if (!pageId && useUriToPageIdCache) {
      try {
        // check if the database has a cached mapping of this URI to page ID
        pageId = await db.get(cacheKey)

        // console.log(`redis get "${cacheKey}"`, pageId)
      } catch (err: any) {
        // ignore redis errors
        console.warn(`redis error get "${cacheKey}"`, err.message)
      }
    }

    if (pageId) {
      const result = await getPageOrError(config, pageId)
      if ('error' in result) {
        return { config, site, pageId, error: result.error }
      }
      recordMap = result.recordMap
    } else {
      // handle mapping of user-friendly canonical page paths to Notion page IDs
      // e.g., /developer-x-entrepreneur versus /71201624b204481f862630ea25ce62fe
      const siteMap = await getSiteMap(config)
      pageId = siteMap?.canonicalPageMap[rawPageId]

      if (pageId) {
        // TODO: we're not re-using the page recordMap from siteMaps because it is
        // cached aggressively
        // recordMap = siteMap.pageMap[pageId]

        const result = await getPageOrError(config, pageId)
        if ('error' in result) {
          return { config, site, pageId, error: result.error }
        }
        recordMap = result.recordMap

        if (useUriToPageIdCache) {
          try {
            // update the database mapping of URI to pageId
            await db.set(cacheKey, pageId, cacheTTL)

            // console.log(`redis set "${cacheKey}"`, pageId, { cacheTTL })
          } catch (err: any) {
            // ignore redis errors
            console.warn(`redis error set "${cacheKey}"`, err.message)
          }
        }
      } else {
        // note: we're purposefully not caching URI to pageId mappings for 404s
        return {
          config,
          error: {
            message: `Not found "${rawPageId}"`,
            statusCode: 404
          }
        }
      }
    }
  } else {
    pageId = site.rootNotionPageId

    const result = await getPageOrError(config, pageId)
    if ('error' in result) {
      return { config, site, pageId, error: result.error }
    }
    recordMap = result.recordMap
  }

  const props: PageProps = { config, site, recordMap, pageId }
  return { ...props, ...(await acl.pageAcl(props)) }
}
