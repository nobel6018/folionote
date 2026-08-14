import { type Decoration } from 'notion-types'
import { getBlockCollectionId, getBlockValue } from 'notion-utils'
import * as React from 'react'
import { Collection as NotionCollection } from 'react-notion-x/build/third-party/collection'

import { isCollectionSearchEnabled } from '@/lib/config'

import { CollectionSearch } from './CollectionSearch'

type CollectionProps = React.ComponentProps<typeof NotionCollection>

/**
 * Notion decoration에서 글자색 annotation(`['h', color]`)을 꺼낸다.
 * `red_background`처럼 배경색 지정은 글자색이 아니므로 건너뛴다.
 */
function getTextColor(name?: Decoration[]): string | undefined {
  if (!name) return undefined

  for (const [, annotations] of name) {
    for (const [type, arg] of annotations || []) {
      if (type === 'h' && arg && !arg.endsWith('_background')) {
        return arg
      }
    }
  }

  return undefined
}

/**
 * react-notion-x는 컬렉션 제목을 `getTextContent()`로 평문화해서 렌더하기 때문에
 * Notion에서 지정한 글자색이 사라진다. 레퍼런스 서비스는 색을 살린다
 * (레퍼런스 사이트의 "⭐ Develop(136)"은 Notion red).
 *
 * 제목을 직접 다시 그리지 않고 CSS 변수만 주입한다. 제목을 직접 그리면
 * react-notion-x가 "뷰 탭 → 제목 → 본문" 순으로 쌓는 DOM 순서를 재현할 수 없어
 * 제목이 탭 위로 올라가 버린다.
 *
 * 래퍼는 색이 없을 때도 항상 감싼다. `.notion-page-content-inner`가
 * `flex column` + `align-items: flex-start`라서, react-notion-x가 클래스 없이
 * 내놓는 뷰 탭/헤더 래퍼가 본문 폭(708px)이 아니라 글자 폭으로 줄어든다.
 * 이 래퍼에 `align-self: stretch`를 걸어 폭을 되찾는다.
 *
 * @see styles/folio-overrides.css 의 .folio-collection
 */
/** 갤러리 카드, 리스트 행, 테이블 행 — 검색으로 걸러낼 대상 */
const ITEM_SELECTOR =
  '.notion-collection-card, .notion-list-item, .notion-table-row'

export function Collection({ block, className, ctx }: CollectionProps) {
  const [query, setQuery] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)

  /**
   * 질의에 맞지 않는 항목에 클래스를 붙여 감춘다.
   *
   * recordMap을 걸러 react-notion-x에 넘기는 방식이 더 React답지만, 키 입력마다
   * recordMap을 깊은 복사해 컬렉션 전체를 다시 렌더해야 하고 react-notion-x
   * 내부 구조에 의존하게 된다. 정적 사이트에서 136장을 거르는 데는 과하다.
   *
   * 레퍼런스 서비스와 같게 제목만이 아니라 태그, 날짜 등 카드에 보이는 모든 텍스트를 본다.
   */
  const applyFilter = React.useCallback(() => {
    const root = containerRef.current
    if (!root) return

    const needle = query.trim().toLowerCase()
    for (const item of root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) {
      const matched =
        !needle || (item.textContent || '').toLowerCase().includes(needle)
      item.classList.toggle('folio-collection-item-hidden', !matched)
    }
  }, [query])

  React.useEffect(() => {
    applyFilter()

    const root = containerRef.current
    if (!root) return

    // 뷰 전환이나 지연 렌더로 항목이 새로 붙어도 필터를 유지한다.
    // classList 변경은 attributes 변화라 childList만 관찰하면 자기 자신을
    // 다시 트리거하지 않는다.
    const observer = new MutationObserver(applyFilter)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [applyFilter])

  const inner = (
    <NotionCollection block={block} className={className} ctx={ctx} />
  )

  // page 타입은 컬렉션 제목이 아니라 페이지 속성 목록이라 색/검색이 필요 없다
  if (block.type === 'page') {
    return inner
  }

  const collectionId = getBlockCollectionId(block, ctx.recordMap)
  const collection = collectionId
    ? getBlockValue(ctx.recordMap.collection[collectionId])
    : undefined
  const color = getTextColor(collection?.name)

  return (
    <div
      ref={containerRef}
      className='folio-collection'
      style={
        color
          ? ({
              '--folio-collection-title-color': `var(--notion-${color})`
            } as React.CSSProperties)
          : undefined
      }
    >
      {isCollectionSearchEnabled && (
        <CollectionSearch query={query} onQueryChange={setQuery} />
      )}

      {inner}
    </div>
  )
}
