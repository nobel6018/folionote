import {
  type ExtendedRecordMap,
  type RecordMap,
  type SearchParams,
  type SearchResults
} from 'notion-types'
import { getBlockValue, mergeRecordMaps } from 'notion-utils'
import pMap from 'p-map'
import pMemoize from 'p-memoize'

import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'
import { type CoreDeps } from './deps.js'
import { getTweetsMap } from './get-tweets.js'
import { getNotion } from './notion-api.js'
import { getPreviewImageMap } from './preview-images.js'

/**
 * 캐시 키에 루트 페이지 ID를 넣는다. 한 프로세스가 사이트 여러 개를 그릴 때
 * 인자 없는 memoize는 먼저 그린 사이트의 내비게이션을 뒤 사이트에도 붙여 버린다.
 */
const getNavigationLinkPages = pMemoize(
  async (
    config: ResolvedSiteConfig,
    deps?: CoreDeps
  ): Promise<ExtendedRecordMap[]> => {
    // 타입 가드를 직접 쓴다. 앱 쪽 `lib/reset.d.ts`(ts-reset)가 붙지 않는 패키지라
    // `filter(Boolean)`만으로는 undefined가 떨어져 나가지 않는다.
    const navigationLinkPageIds = (config.navigationLinks || [])
      .map((link) => link?.pageId)
      .filter((pageId): pageId is string => !!pageId)

    if (config.navigationStyle !== 'default' && navigationLinkPageIds.length) {
      return pMap(
        navigationLinkPageIds,
        async (navigationLinkPageId) =>
          getNotion(deps).getPage(navigationLinkPageId, {
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
  },
  { cacheKey: ([config]) => config.rootNotionPageId }
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

/**
 * 사람 멘션(`@이름`)을 평범한 텍스트로 바꿔 놓는다.
 *
 * Notion은 멘션을 `['‣', [['u', userId]]]` 데코레이션으로 준다. react-notion-x는
 * 이걸 아바타 + 이름으로 그리려 하는데, **프로필 사진이 없으면 통째로 null을
 * 반환해** 멘션이 화면에서 사라진다. 우리 워크스페이스 사용자에는 사진이 없어서
 * "2024-03-29 @이영훈"이 "2024-03-29"로만 보였다.
 *
 * 레퍼런스 서비스는 아바타 없이 흐린 `@이름` 텍스트로만 그린다. 같은 결과를 내려고
 * 데코레이션 자체를 텍스트로 바꾼다. react-notion-x의 Text에는 이 부분을
 * 갈아끼울 수 있는 컴포넌트 훅이 없어서 데이터 쪽에서 처리한다.
 */
function renderUserMentionsAsText(recordMap: ExtendedRecordMap) {
  const users = recordMap.notion_user
  if (!users) return

  for (const record of Object.values(recordMap.block || {})) {
    const properties = getBlockValue(record)?.properties
    if (!properties) continue

    for (const decorations of Object.values(properties)) {
      if (!Array.isArray(decorations)) continue

      for (const [index, entry] of decorations.entries()) {
        const decoration = entry as any
        const annotations = decoration?.[1]
        if (decoration?.[0] !== '‣' || !annotations) continue

        const mention = annotations.find(
          (annotation: any) => annotation?.[0] === 'u'
        )
        if (!mention) continue

        const user: any = getBlockValue(users[mention[1] as string] as any)
        const name =
          user?.name ||
          [user?.given_name, user?.family_name].filter(Boolean).join(' ')

        if (name) {
          decorations[index] = [`@${name}`, [['h', 'gray']]] as any
        }
      }
    }
  }
}

/** 노션이 직접 호스팅하는 파일인지. notion-client가 서명 대상을 고르는 기준과 같다. */
function isNotionHostedFile(source: string): boolean {
  return (
    source.includes('secure.notion-static.com') ||
    source.includes('prod-files-secure') ||
    source.includes('attachment:')
  )
}

/**
 * 동영상·파일·PDF·오디오의 주소를 만료되지 않는 노션 리다이렉터로 바꾼다.
 *
 * notion-client는 `getSignedFileUrls`로 받은 **서명된** S3 주소를
 * `recordMap.signed_urls`에 채우고, react-notion-x는 그걸 그대로 `<video src>`에
 * 박는다(build/index.js:825). 그런데 이 서명은 6시간 남짓이면 만료된다. ISR은
 * 요청이 와야 재생성하므로 한동안 방문이 없던 페이지는 그 사이 만들어둔 HTML을
 * 그대로 내보낸다. 즉 오래 조용했던 페이지의 첫 방문자만 죽은 링크를 받는다.
 *
 * `www.notion.so/signed/<원본주소>?table=block&id=<blockId>`는 요청마다 새 서명을
 * 발급해 `file.notion.so`로 302를 주는 리다이렉터라 늙지 않는다. 바이트도 노션이
 * 내보내므로 우리 대역폭은 들지 않는다. 이미지는 `mapImageUrl`이 이미 같은 성격의
 * `www.notion.so/image/...`로 감싸고 있어 손댈 필요가 없다.
 */
function useStableFileUrls(recordMap: ExtendedRecordMap) {
  const signedUrls = (recordMap.signed_urls ??= {})

  for (const [blockId, record] of Object.entries(recordMap.block || {})) {
    const block = getBlockValue(record)
    if (!block) continue

    // 이미지는 제외한다. mapImageUrl이 따로 처리하고, 여기서 덮으면 이중으로 감싼다.
    if (!['video', 'file', 'pdf', 'audio'].includes(block.type)) continue

    const source = block.properties?.source?.[0]?.[0] as string | undefined
    if (!source || !isNotionHostedFile(source)) continue

    signedUrls[blockId] =
      `https://www.notion.so/signed/${encodeURIComponent(source)}?table=block&id=${blockId}`
  }
}

/**
 * Notion의 협업 편집 데이터(`crdt_data`, `crdt_format_version`)를 블록에서 떼어낸다.
 *
 * Notion은 새 편집 포맷에서 텍스트 블록에 `properties.title`과 나란히 `crdt_data`를
 * 함께 내려주는데, 여기에 **지금 화면에 없는 옛 텍스트와 링크가 편집 이력으로 그대로
 * 들어 있다.** react-notion-x는 `properties.title`만 읽으므로 화면은 멀쩡하지만,
 * recordMap은 `__NEXT_DATA__`로 HTML에 실려 나가기 때문에 사용자가 Notion에서 지운
 * 문장이 사이트 소스에는 남는다. 실제로 이 리포 데모 페이지 소스에는 지워진 외부 링크
 * 주소가 두 블록에 걸쳐 7번 들어 있었다.
 *
 * 렌더러가 읽지 않는 데이터라 지워도 화면은 그대로이고, 용량은 크게 줄어든다. 루트
 * 페이지의 `__NEXT_DATA__`가 52.4KB에서 21.5KB로, HTML 전체가 77.5KB에서 46.6KB로
 * 줄었다.
 */
function stripCrdtData(recordMap: RecordMap) {
  for (const record of Object.values(recordMap.block || {})) {
    const block = getBlockValue(record) as any
    if (!block) continue

    delete block.crdt_data
    delete block.crdt_format_version
  }
}

export async function getPage(
  config: ResolvedSiteConfig,
  pageId: string,
  deps?: CoreDeps
): Promise<ExtendedRecordMap> {
  let recordMap = await getNotion(deps).getPage(pageId)

  fillEmptyCollectionViewNames(recordMap)
  renderUserMentionsAsText(recordMap)
  useStableFileUrls(recordMap)

  if (config.navigationStyle !== 'default') {
    // ensure that any pages linked to in the custom navigation header have
    // their block info fully resolved in the page record map so we know
    // the page title, slug, etc.
    const navigationLinkRecordMaps = await getNavigationLinkPages(config, deps)

    if (navigationLinkRecordMaps?.length) {
      recordMap = navigationLinkRecordMaps.reduce(
        (map, navigationLinkRecordMap) =>
          mergeRecordMaps(map, navigationLinkRecordMap),
        recordMap
      )
    }
  }

  if (config.isPreviewImageSupportEnabled) {
    const previewImageMap = await getPreviewImageMap(config, recordMap, deps)
    ;(recordMap as any).preview_images = previewImageMap
  }

  // 내비게이션 링크 페이지를 병합한 뒤에 지운다. mergeRecordMaps가 그쪽 recordMap의
  // 편집 이력을 그대로 끌고 들어오기 때문이다.
  stripCrdtData(recordMap)

  await getTweetsMap(config, recordMap, deps)

  return recordMap
}

export async function search(
  params: SearchParams,
  deps?: CoreDeps
): Promise<SearchResults> {
  const results = await getNotion(deps).search(params)

  flattenSearchRecordMap(results)
  stripCrdtData(results.recordMap)

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
