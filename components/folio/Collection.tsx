import { type Decoration } from 'notion-types'
import { getBlockCollectionId, getBlockValue } from 'notion-utils'
import * as React from 'react'
import { Collection as NotionCollection } from 'react-notion-x/build/third-party/collection'

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
export function Collection({ block, className, ctx }: CollectionProps) {
  const inner = <NotionCollection block={block} className={className} ctx={ctx} />

  // page 타입은 컬렉션 제목이 아니라 페이지 속성 목록이라 색 처리가 필요 없다
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
      className='folio-collection'
      style={
        color
          ? ({
              '--folio-collection-title-color': `var(--notion-${color})`
            } as React.CSSProperties)
          : undefined
      }
    >
      {inner}
    </div>
  )
}
