import { type ExtendedRecordMap } from 'notion-types'
import {
  getCanonicalPageId as getCanonicalPageIdImpl,
  parsePageId
} from 'notion-utils'

import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'

export function getCanonicalPageId(
  config: ResolvedSiteConfig,
  pageId: string,
  recordMap: ExtendedRecordMap,
  { uuid = true }: { uuid?: boolean } = {}
): string | undefined {
  const cleanPageId = parsePageId(pageId, { uuid: false })
  if (!cleanPageId) {
    return
  }

  const override = config.inversePageUrlOverrides[cleanPageId]
  if (override) {
    return override
  } else if (config.strictPaths) {
    // 엄격 모드는 제목 slug 주소를 받지 않는다(@see SiteConfig.strictPaths). 링크도
    // ID 주소로 만들어야 목록에 없는 하위 페이지로 가는 링크가 404가 되지 않는다.
    return cleanPageId
  } else {
    return (
      getCanonicalPageIdImpl(pageId, recordMap, {
        uuid
      }) ?? undefined
    )
  }
}
