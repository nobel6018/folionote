import {
  type Block,
  type Collection,
  type ExtendedRecordMap
} from 'notion-types'
import { getBlockCollectionId, getBlockValue } from 'notion-utils'

const CUSTOM_EMOJI_PREFIX = 'notion://custom_emoji/'

/**
 * 렌더러에 넘기기 전에 recordMap을 서버와 브라우저가 똑같이 그릴 수 있는 모양으로
 * 고친다. 서버에서 한 번 부르고 결과를 props로 내려보낸다.
 *
 * 1. 컬렉션 아이콘을 블록의 `page_icon`에 미리 얹는다.
 *    react-notion-x의 Collection 컴포넌트가 렌더 도중에 같은 일을 한다
 *    (`block.format = { ...block.format, page_icon: collection.icon }`). 서버에서는
 *    페이지 제목이 그 전에 그려져 아이콘이 빠지고, 브라우저에서는 dynamic import로
 *    렌더가 한 번 더 돌면서 고쳐진 값으로 아이콘을 그린다. 그래서 컬렉션 아이콘이
 *    있는 전체 페이지 DB마다 hydration 오류(#418)가 났다.
 * 2. Notion 커스텀 이모지 아이콘(`notion://custom_emoji/<space>/<id>`)을 실제
 *    이미지 주소로 바꾼다. 그대로 두면 이미지 프록시가 이 주소를 못 읽어 깨진
 *    이미지가 된다. 실제 주소는 recordMap의 `custom_emoji`에 같이 내려온다.
 *
 * recordMap을 제자리에서 고치고 같은 객체를 돌려준다.
 */
export function normalizeRecordMap(
  recordMap: ExtendedRecordMap
): ExtendedRecordMap {
  const customEmoji = (recordMap as any).custom_emoji ?? {}
  const resolveIcon = (icon: string | undefined): string | undefined => {
    if (!icon?.startsWith(CUSTOM_EMOJI_PREFIX)) {
      return icon
    }
    const emojiId = icon.slice(CUSTOM_EMOJI_PREFIX.length).split('/').pop()
    const emoji = emojiId
      ? (getBlockValue(customEmoji[emojiId]) as { url?: string } | undefined)
      : undefined
    return emoji?.url ?? icon
  }

  for (const entry of Object.values(recordMap.collection ?? {})) {
    const collection = getBlockValue(entry) as Collection | undefined
    if (collection?.icon) {
      collection.icon = resolveIcon(collection.icon)!
    }
  }

  for (const entry of Object.values(recordMap.block ?? {})) {
    const block = getBlockValue(entry) as Block | undefined
    if (!block) {
      continue
    }

    const format = (block as any).format as { page_icon?: string } | undefined

    if (format?.page_icon) {
      format.page_icon = resolveIcon(format.page_icon)
    }

    if (
      (block.type === 'collection_view_page' ||
        block.type === 'collection_view') &&
      !format?.page_icon
    ) {
      // collection_id 자리와 format.collection_pointer 자리 둘 다 본다
      const collectionId = getBlockCollectionId(block, recordMap)
      const collection = collectionId
        ? (getBlockValue(recordMap.collection?.[collectionId]) as
            | Collection
            | undefined)
        : undefined

      if (collection?.icon) {
        ;(block as any).format = { ...format, page_icon: collection.icon }
      }
    }
  }

  return recordMap
}
