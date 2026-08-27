import { type Block } from 'notion-types'

import { type PageProps } from '../types.js'

export async function pageAcl({
  site,
  recordMap,
  pageId
}: PageProps): Promise<Partial<PageProps> | undefined> {
  if (!site) {
    return {
      error: {
        statusCode: 404,
        message: 'Unable to resolve notion site'
      }
    }
  }

  if (!recordMap) {
    return {
      error: {
        statusCode: 404,
        message: `Unable to resolve page for domain "${site.domain}". Notion page "${pageId}" not found.`
      }
    }
  }

  const keys = Object.keys(recordMap.block)
  const rootKey = keys[0]

  if (!rootKey) {
    return {
      error: {
        statusCode: 404,
        message: `Unable to resolve page for domain "${site.domain}". Notion page "${pageId}" invalid data.`
      }
    }
  }

  // react-notion-x v7.10에서 record value가 union (Block | { role, value })으로
  // 확장됨. cast로 narrow.
  const rootValue = recordMap.block[rootKey]?.value as Block | undefined
  const rootSpaceId = rootValue?.space_id

  if (
    rootSpaceId &&
    site.rootNotionSpaceId &&
    rootSpaceId !== site.rootNotionSpaceId
  ) {
    if (process.env.NODE_ENV) {
      return {
        error: {
          statusCode: 404,
          message: `Notion page "${pageId}" doesn't belong to the Notion workspace owned by "${site.domain}".`
        }
      }
    }
  }
}
