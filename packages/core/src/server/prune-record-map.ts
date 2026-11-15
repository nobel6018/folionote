import { type Block, type ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

/** 블록의 속성과 서식에 들어 있는 다른 블록의 ID. 멘션, 별칭, 동기화 블록 원본 등 */
function getReferencedIds(block: Block): string[] {
  const text = JSON.stringify([block.properties, block.format])
  return text.match(UUID_PATTERN) ?? []
}

/**
 * 현재 페이지를 그리는 데 쓰이지 않는 블록을 recordMap에서 지운다.
 *
 * recordMap은 `__NEXT_DATA__`로 HTML에 그대로 실린다. notion-client는 컬렉션 카드로
 * 보이는 글들의 본문 블록과, 내비게이션 링크 페이지의 본문까지 함께 내려준다. 카드에는
 * 제목, 커버, 속성만 그려지는데도 note.leedo.me 홈은 블록 1,740개, `__NEXT_DATA__`
 * 2.0MB(gzip 474KB)였고 그중 화면에 쓰이는 블록은 473개였다(2026-11-16). 느린 회선에서는
 * 이 HTML을 받는 시간이 첫 화면의 가장 큰 요소(LCP) 대기 시간을 대부분 차지했다.
 *
 * 남기는 것
 * - 현재 페이지와 그 본문 트리
 * - 상위 페이지(브레드크럼). 컬렉션 안의 글이면 컬렉션을 거쳐 올라간다
 * - 컬렉션 쿼리 결과에 든 카드 페이지. 본문은 내려가지 않는다
 * - 남긴 블록이 속성이나 서식으로 가리키는 블록(멘션, 별칭, 동기화 블록 원본). 페이지가
 *   아니면 그 본문도 남긴다
 * - `keepIds`로 받은 블록(내비게이션 링크 페이지)
 *
 * 카드 페이지의 `content`(본문 블록 ID 목록)는 첫 이미지 하나만 남긴다. 갤러리 커버를
 * "페이지 내용"으로 둔 뷰가 그 이미지를 쓴다. 블록의 필드는 지우지 않는다. 생성 시각과
 * 작성자 같은 필드는 컬렉션 속성 열이 읽는다.
 *
 * @see docs/architecture.md
 */
export function pruneRecordMap(
  recordMap: ExtendedRecordMap,
  {
    pageId,
    keepIds = []
  }: {
    pageId: string
    keepIds?: string[]
  }
): void {
  const blocks = recordMap.block || {}
  const getBlock = (id: string) =>
    getBlockValue(blocks[id]) as Block | undefined
  const root = findBlockId(blocks, pageId)
  if (!root) {
    return
  }

  const kept = new Set<string>()
  const descended = new Set<string>()
  // [블록 ID, 본문까지 내려갈지]
  const queue: Array<[string, boolean]> = [[root, true]]

  const visit = (id: string, descend: boolean) => {
    if (!blocks[id]) return
    if (descend ? descended.has(id) : kept.has(id)) return
    queue.push([id, descend])
  }

  for (const id of collectAncestorIds(recordMap, root)) {
    visit(id, false)
  }
  for (const id of keepIds) {
    const blockId = findBlockId(blocks, id)
    if (blockId) visit(blockId, false)
  }
  for (const views of Object.values(recordMap.collection_query || {})) {
    for (const result of Object.values(views || {})) {
      for (const id of JSON.stringify(result).match(UUID_PATTERN) ?? []) {
        visit(id, false)
      }
    }
  }

  while (queue.length) {
    const [id, descend] = queue.pop()!
    const block = getBlock(id)
    if (!block) continue

    kept.add(id)
    for (const refId of getReferencedIds(block)) {
      const ref = getBlock(refId)
      if (ref) visit(refId, ref.type !== 'page')
    }

    // 다른 페이지는 본문으로 내려가지 않고 첫 이미지만 남긴다 (갤러리 "페이지 내용" 커버)
    if (block.type === 'page' && id !== root) {
      const firstImageId = findFirstImageId(block, getBlock)
      if (firstImageId) visit(firstImageId, false)
      continue
    }

    if (!descend || descended.has(id)) continue
    descended.add(id)

    for (const childId of block.content ?? []) {
      visit(childId, true)
    }
  }

  for (const id of Object.keys(blocks)) {
    if (!kept.has(id)) {
      delete blocks[id]
    }
  }

  for (const id of kept) {
    const block = getBlock(id)
    if (!block || block.type !== 'page' || id === root || !block.content) {
      continue
    }

    const firstImageId = findFirstImageId(block, getBlock)
    block.content = firstImageId ? [firstImageId] : []
  }
}

function findFirstImageId(
  block: Block,
  getBlock: (id: string) => Block | undefined
): string | undefined {
  return block.content?.find((childId) => getBlock(childId)?.type === 'image')
}

function findBlockId(
  blocks: ExtendedRecordMap['block'],
  pageId: string
): string | undefined {
  if (blocks[pageId]) return pageId

  const compact = pageId.replaceAll('-', '')
  return Object.keys(blocks).find((id) => id.replaceAll('-', '') === compact)
}

/** 브레드크럼이 따라 올라가는 상위 블록. 컬렉션 안의 글은 컬렉션의 부모로 건너간다 */
function collectAncestorIds(
  recordMap: ExtendedRecordMap,
  blockId: string
): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  let current: any = getBlockValue(recordMap.block[blockId])

  while (current?.parent_id && !seen.has(current.parent_id)) {
    const parentId: string = current.parent_id
    seen.add(parentId)

    if (current.parent_table === 'collection') {
      current = getBlockValue(recordMap.collection?.[parentId] as any)
      continue
    }

    current = getBlockValue(recordMap.block[parentId])
    if (current) ids.push(parentId)
  }

  return ids
}
