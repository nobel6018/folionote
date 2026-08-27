import { type ExtendedRecordMap } from 'notion-types'
import { parsePageId, uuidToId } from 'notion-utils'

import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'
import { getCanonicalPageId } from './get-canonical-page-id.js'

export const mapPageUrl =
  (
    config: ResolvedSiteConfig,
    recordMap: ExtendedRecordMap,
    searchParams: URLSearchParams
  ) =>
  (pageId = '') => {
    // 로컬 개발에서는 URL에 UUID를 붙여 둔다. 디버깅이 쉽고 canonical 조회를 건너뛴다
    const uuid = !!config.includeNotionIdInUrls
    const pageUuid = parsePageId(pageId, { uuid: true })!

    if (uuidToId(pageUuid) === config.rootNotionPageId) {
      return createUrl('/', searchParams)
    } else {
      return createUrl(
        `/${getCanonicalPageId(config, pageUuid, recordMap, { uuid })}`,
        searchParams
      )
    }
  }

export const getCanonicalPageUrl =
  (config: ResolvedSiteConfig, recordMap: ExtendedRecordMap) =>
  (pageId = '') => {
    const uuid = !!config.includeNotionIdInUrls
    const pageUuid = parsePageId(pageId, { uuid: true })!

    if (uuidToId(pageId) === config.rootNotionPageId) {
      return `https://${config.domain}`
    } else {
      return `https://${config.domain}/${getCanonicalPageId(
        config,
        pageUuid,
        recordMap,
        { uuid }
      )}`
    }
  }

function createUrl(path: string, searchParams: URLSearchParams) {
  return [path, searchParams.toString()].filter(Boolean).join('?')
}
