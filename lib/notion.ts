import {
  type ExtendedRecordMap,
  type SearchParams,
  type SearchResults
} from 'notion-types'
import { getBlockValue, mergeRecordMaps } from 'notion-utils'
import pMap from 'p-map'
import pMemoize from 'p-memoize'

import {
  isPreviewImageSupportEnabled,
  navigationLinks,
  navigationStyle
} from './config'
import { getTweetsMap } from './get-tweets'
import { notion } from './notion-api'
import { getPreviewImageMap } from './preview-images'

const getNavigationLinkPages = pMemoize(
  async (): Promise<ExtendedRecordMap[]> => {
    const navigationLinkPageIds = (navigationLinks || [])
      .map((link) => link?.pageId)
      .filter(Boolean)

    if (navigationStyle !== 'default' && navigationLinkPageIds.length) {
      return pMap(
        navigationLinkPageIds,
        async (navigationLinkPageId) =>
          notion.getPage(navigationLinkPageId, {
            chunkLimit: 1,
            fetchMissingBlocks: false,
            fetchCollections: false,
            signFileUrls: false
          }),
        {
          concurrency: 4
        }
      )
    }

    return []
  }
)

/**
 * 이름을 지정하지 않은 컬렉션 뷰는 Notion이 `name: ''`로 내려준다.
 * react-notion-x는 이때 `"Table view"`처럼 " view"를 붙여 폴백하는데,
 * Notion UI와 레퍼런스 서비스는 타입 이름만 쓴다("Table", "List").
 * 뷰 탭 라벨을 맞추기 위해 빈 이름을 타입 이름으로 채운다.
 */
function fillEmptyCollectionViewNames(recordMap: ExtendedRecordMap) {
  for (const record of Object.values(recordMap.collection_view || {})) {
    const view = getBlockValue(record)
    if (view && !view.name) {
      view.name = view.type.charAt(0).toUpperCase() + view.type.slice(1)
    }
  }
}

export async function getPage(pageId: string): Promise<ExtendedRecordMap> {
  let recordMap = await notion.getPage(pageId)

  fillEmptyCollectionViewNames(recordMap)

  if (navigationStyle !== 'default') {
    // ensure that any pages linked to in the custom navigation header have
    // their block info fully resolved in the page record map so we know
    // the page title, slug, etc.
    const navigationLinkRecordMaps = await getNavigationLinkPages()

    if (navigationLinkRecordMaps?.length) {
      recordMap = navigationLinkRecordMaps.reduce(
        (map, navigationLinkRecordMap) =>
          mergeRecordMaps(map, navigationLinkRecordMap),
        recordMap
      )
    }
  }

  if (isPreviewImageSupportEnabled) {
    const previewImageMap = await getPreviewImageMap(recordMap)
    ;(recordMap as any).preview_images = previewImageMap
  }

  await getTweetsMap(recordMap)

  return recordMap
}

export async function search(params: SearchParams): Promise<SearchResults> {
  const results = await notion.search(params)

  flattenSearchRecordMap(results)

  return results
}

/**
 * 검색 응답의 블록을 한 겹 벗겨 react-notion-x가 읽을 수 있는 모양으로 만든다.
 *
 * Notion이 주는 검색 recordMap의 블록은 `{ value: { value: Block, role } }`로
 * 한 번 더 감싸여 있다. 그런데 react-notion-x의 검색 다이얼로그는
 * `recordMap.block[id].value`를 곧바로 Block으로 보고 제목을 뽑고, 제목이 없으면
 * **그 결과를 버린다**. 그래서 API가 결과를 제대로 돌려줘도 화면에는
 * "No results"만 뜬다.
 *
 * 페이지 렌더 경로는 notion-utils의 `getBlockValue()`가 이 union을 풀어주지만
 * 검색 다이얼로그는 그 함수를 쓰지 않는다. 그래서 여기서 미리 펴 둔다.
 */
function flattenSearchRecordMap(results: SearchResults) {
  const blocks = results?.recordMap?.block
  if (!blocks) return

  for (const [id, record] of Object.entries(blocks)) {
    const value: any = (record as any)?.value

    if (value && typeof value === 'object' && 'value' in value) {
      blocks[id] = { ...(record as any), value: value.value }
    }
  }
}
