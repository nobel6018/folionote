import { type ExtendedRecordMap } from 'notion-types'
import {
  getCanonicalPageId as getCanonicalPageIdImpl,
  parsePageId
} from 'notion-utils'

import { type ResolvedSiteConfig } from './site-config-resolve'

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
  } else {
    return (
      getCanonicalPageIdImpl(pageId, recordMap, {
        uuid
      }) ?? undefined
    )
  }
}
