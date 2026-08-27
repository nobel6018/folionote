import { type Block } from 'notion-types'
import {
  getAllPagesInSpace,
  getBlockValue,
  getPageProperty,
  uuidToId
} from 'notion-utils'
import pMemoize from 'p-memoize'

import type * as types from './types'
import { getCanonicalPageId } from './get-canonical-page-id'
import { notion } from './notion-api'
import { type ResolvedSiteConfig } from './site-config-resolve'

export async function getSiteMap(
  config: ResolvedSiteConfig
): Promise<types.SiteMap> {
  const partialSiteMap = await getAllPages(
    config,
    config.rootNotionPageId,
    config.rootNotionSpaceId ?? undefined
  )

  return {
    site: config.site,
    ...partialSiteMap
  } as types.SiteMap
}

/**
 * 캐시 키에 설정의 루트 페이지 ID를 넣는다. 설정 객체를 통째로 직렬화하면 키가
 * 수십 KB가 되고, 값이 조금만 달라도 캐시가 새로 잡힌다.
 */
const getAllPages = pMemoize(getAllPagesImpl, {
  cacheKey: ([config, ...rest]) =>
    JSON.stringify([config.rootNotionPageId, ...rest])
})

/**
 * 사이트맵/RSS용 페이지 읽기. 429를 만나면 지수 백오프로 다시 시도한다.
 *
 * 전역 `ofetchOptions`의 고정 지연 재시도만으로는 부족했다. 444개를 훑는 동안
 * 287개가 429로 실패했다. 고정 지연은 실패한 요청들이 같은 간격으로 함께 몰려
 * 다시 부딪히기 때문에, 대기 시간을 늘리면서 지터로 흩어야 한다.
 *
 * 타임아웃은 전역 `ofetchOptions`에 있다 (@see lib/notion-api.ts). 여기서
 * `kyOptions`를 넘기고 있었는데, notion-client가 ky에서 ofetch로 옮긴 뒤로는
 * 조용히 무시되는 값이었다.
 */
/** 크롤 전체에 허용하는 시간. 서버리스 함수 한도(300s) 아래로 잡는다 */
const CRAWL_BUDGET_MS = 200_000

/** 예산이 끝나 크롤을 접었다는 표시 */
class CrawlBudgetExceededError extends Error {
  constructor() {
    super('crawl budget exceeded')
  }
}

/**
 * 사이트맵/RSS용 페이지 읽기. 429를 만나면 지수 백오프로 다시 시도한다.
 *
 * 전역 `ofetchOptions`의 고정 지연 재시도만으로는 부족했다. 444개를 훑는 동안
 * 287개가 429로 실패했다. 고정 지연은 실패한 요청들이 같은 간격으로 함께 몰려
 * 다시 부딪히기 때문에, 대기 시간을 늘리면서 지터로 흩어야 한다.
 *
 * `deadline`을 넘기면 곧바로 포기한다. `getAllPagesInSpace`는 실패한 페이지를
 * null로 남기고 계속 진행하므로, 이 포기가 크롤 전체를 시간 안에 끝내는 장치가 된다.
 * 남은 페이지 없이 완주하는 것보다, 늦지 않게 지금까지 읽은 것을 내놓는 편이 낫다.
 * (예산을 안 두면 444개 크롤이 11분 48초까지 갔다. 함수 한도를 넘겨 504가 된다.)
 *
 * 타임아웃은 전역 `ofetchOptions`에 있다 (@see lib/notion-api.ts). 여기서
 * `kyOptions`를 넘기고 있었는데, notion-client가 ky에서 ofetch로 옮긴 뒤로는
 * 조용히 무시되는 값이었다.
 */
const createGetPage = (deadline: number, stats: { budgetSkipped: number }) => {
  return async (pageId: string, opts?: any) => {
    if (Date.now() > deadline) {
      stats.budgetSkipped++
      throw new CrawlBudgetExceededError()
    }

    console.log('\nnotion getPage', uuidToId(pageId))

    const maxAttempts = 5

    // 크롤은 제목과 slug만 쓰므로 파일 서명은 필요 없다. 켜두면 첨부가 있는
    // 페이지마다 getSignedFileUrls 왕복이 한 번씩 더 붙어 예산만 깎는다.
    const crawlOpts = { ...opts, signFileUrls: false }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await notion.getPage(pageId, crawlOpts)
      } catch (err: any) {
        const status = err?.statusCode ?? err?.status ?? err?.response?.status
        const isRetriable = status === 429 || (status >= 500 && status < 600)
        if (!isRetriable || attempt === maxAttempts - 1) {
          throw err
        }

        // 1s, 2s, 4s, 8s + 최대 1s 지터. 예산을 넘길 대기라면 기다리지 않는다.
        const delayMs = 1000 * 2 ** attempt + Math.floor(Math.random() * 1000)
        if (Date.now() + delayMs > deadline) {
          stats.budgetSkipped++
          throw new CrawlBudgetExceededError()
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    // 위 루프는 반드시 return이나 throw로 끝난다
    throw new Error(`unreachable: getPage("${pageId}")`)
  }
}

async function getAllPagesImpl(
  config: ResolvedSiteConfig,
  rootNotionPageId: string,
  rootNotionSpaceId?: string,
  {
    maxDepth = 1
  }: {
    maxDepth?: number
  } = {}
): Promise<Partial<types.SiteMap>> {
  const startedAt = Date.now()
  const stats = { budgetSkipped: 0 }

  const pageMap = await getAllPagesInSpace(
    rootNotionPageId,
    rootNotionSpaceId,
    createGetPage(startedAt + CRAWL_BUDGET_MS, stats),
    {
      maxDepth,
      // 라이브러리 기본값. 낮추면 429는 줄지만 예산 안에 읽는 페이지 수도 줄어서,
      // 429를 백오프로 흡수하고 동시성은 유지하는 쪽이 결과가 좋았다.
      concurrency: 4
    }
  )

  // 읽기에 실패한 페이지 수. 조용히 빠지면 사이트맵이 완전한 줄 오해한다.
  const failedPageIds: string[] = []

  const canonicalPageMap = Object.keys(pageMap).reduce(
    (map: Record<string, string>, pageId: string) => {
      const recordMap = pageMap[pageId]
      // getAllPagesInSpace는 페이지 하나가 실패하면 예외를 던지지 않고 null을 넣는다.
      // 그 null을 예외로 바꾸고 있었던 탓에, 429 하나가 사이트맵 전체를 날렸다.
      // (사이트맵은 root만 담은 폴백 2줄로, RSS는 500으로 떨어졌다.)
      // 실패한 페이지만 빼고 나머지는 살린다.
      if (!recordMap) {
        failedPageIds.push(pageId)
        return map
      }

      // v7.10부터 record 값이 `Block | { role, value }` union이라 `.value`만 꺼내면
      // bare Block인 경우 undefined가 된다. getBlockValue로 풀어야 한다.
      const block = getBlockValue(recordMap.block[pageId]) as Block | undefined
      if (
        !block ||
        !(getPageProperty<boolean | null>('Public', block, recordMap) ?? true)
      ) {
        return map
      }

      const canonicalPageId = getCanonicalPageId(config, pageId, recordMap, {
        uuid: !!config.includeNotionIdInUrls
      })!

      if (map[canonicalPageId]) {
        // you can have multiple pages in different collections that have the same id
        // TODO: we may want to error if neither entry is a collection page
        console.warn('error duplicate canonical page id', {
          canonicalPageId,
          pageId,
          existingPageId: map[canonicalPageId]
        })

        return map
      } else {
        return {
          ...map,
          [canonicalPageId]: pageId
        }
      }
    },
    {}
  )

  const total = Object.keys(pageMap).length
  console.log(
    `siteMap: ${total - failedPageIds.length}/${total} 페이지 수집, ${Math.round((Date.now() - startedAt) / 1000)}s 소요`
  )
  if (failedPageIds.length) {
    console.warn(
      `siteMap: ${failedPageIds.length}개가 빠졌다 (시간 예산 초과 ${stats.budgetSkipped}건 포함). 사이트맵과 RSS에서 누락된다`,
      failedPageIds.slice(0, 10).map((id) => uuidToId(id))
    )
  }

  return {
    pageMap,
    canonicalPageMap
  }
}
