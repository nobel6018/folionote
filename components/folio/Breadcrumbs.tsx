import { type Block, type Collection } from 'notion-types'
import {
  getBlockValue,
  getPageBreadcrumbs,
  getTextContent
} from 'notion-utils'
import * as React from 'react'
import { cs, PageIcon, useNotionContext } from 'react-notion-x'

type Crumb = {
  key: string
  title: string
  icon?: string
  /** 링크를 걸 블록 id. 없으면 현재 페이지라 링크를 걸지 않는다 */
  pageId?: string
  /** PageIcon에 넘길 블록 (아이콘 렌더용) */
  block: Block
}

/**
 * 컬렉션에 속한 페이지의 경로에 컬렉션 자신을 끼워 넣는다.
 *
 * `notion-utils`의 `getPageBreadcrumbs`는 부모 *페이지*만 따라 올라가므로
 * 컬렉션(데이터베이스)은 페이지가 아니어서 건너뛴다. 그래서 글 페이지 경로가
 * "이도(李裪) / 글제목"이 되는데, 레퍼런스 서비스는 그 사이에 컬렉션을 넣는다:
 * "이도(李裪) / ⭐ Develop(136) / ✍🏻 Spring에서 HTTP 요청 로깅하기".
 *
 * 링크는 컬렉션을 품고 있는 `collection_view` 블록으로 건다. 이 블록 id가
 * `pageUrlOverrides`의 키(`/devs` 등)와 이어져 pretty URL로 해석된다.
 */
function findCollectionCrumb(
  block: Block,
  recordMap: ReturnType<typeof useNotionContext>['recordMap']
): Crumb | undefined {
  if (block.parent_table !== 'collection') {
    return undefined
  }

  const collection = getBlockValue<Collection>(
    recordMap.collection?.[block.parent_id] as any
  )
  if (!collection) {
    return undefined
  }

  const title = getTextContent(collection.name).trim()
  if (!title) {
    return undefined
  }

  // 이 컬렉션을 보여주는 collection_view 블록을 찾아 링크 대상으로 쓴다
  const hostBlockId = Object.keys(recordMap.block).find((id) => {
    const candidate = getBlockValue(recordMap.block[id])
    return (
      (candidate?.type === 'collection_view' ||
        candidate?.type === 'collection_view_page') &&
      (candidate as any).collection_id === block.parent_id
    )
  })

  return {
    key: `collection-${block.parent_id}`,
    title,
    icon: collection.icon,
    pageId: hostBlockId,
    // PageIcon이 읽을 수 있도록 컬렉션 아이콘을 page_icon 자리에 얹는다
    block: {
      ...block,
      format: { ...(block as any).format, page_icon: collection.icon }
    } as Block
  }
}

/**
 * react-notion-x의 `Breadcrumbs`를 대체한다. 마크업과 클래스는 그대로 맞춰
 * 기존 `.breadcrumbs` / `.breadcrumb` 스타일이 계속 적용되게 했다.
 */
export function Breadcrumbs({
  block,
  rootOnly = false
}: {
  block: Block
  rootOnly?: boolean
}) {
  const { recordMap, mapPageUrl, components } = useNotionContext()

  const crumbs = React.useMemo<Crumb[]>(() => {
    const pageCrumbs = (getPageBreadcrumbs(recordMap, block.id) || []).filter(
      Boolean
    )

    if (rootOnly) {
      const root = pageCrumbs[0]
      return root
        ? [
            {
              key: root.pageId,
              title: root.title,
              icon: root.icon,
              pageId: root.active ? undefined : root.pageId,
              block: root.block
            }
          ]
        : []
    }

    const mapped: Crumb[] = pageCrumbs.map((crumb) => ({
      key: crumb.pageId,
      title: crumb.title,
      icon: crumb.icon,
      pageId: crumb.active ? undefined : crumb.pageId,
      block: crumb.block
    }))

    const collectionCrumb = findCollectionCrumb(block, recordMap)
    if (collectionCrumb) {
      // 현재 페이지(마지막 항목) 바로 앞에 컬렉션을 끼운다
      mapped.splice(Math.max(mapped.length - 1, 0), 0, collectionCrumb)
    }

    return mapped
  }, [recordMap, block, rootOnly])

  return (
    <div className='breadcrumbs' key='breadcrumbs'>
      {crumbs.map((crumb, index) => {
        const isActive = !crumb.pageId
        const Wrapper = isActive
          ? (props: any) => <div {...props} />
          : components.PageLink

        return (
          <React.Fragment key={crumb.key}>
            <Wrapper
              className={cs('breadcrumb', isActive && 'active')}
              {...(isActive ? {} : { href: mapPageUrl(crumb.pageId!) })}
            >
              {crumb.icon && (
                <PageIcon className='icon' block={crumb.block} />
              )}
              {crumb.title && <span className='title'>{crumb.title}</span>}
            </Wrapper>

            {index < crumbs.length - 1 && <span className='spacer'>/</span>}
          </React.Fragment>
        )
      })}
    </div>
  )
}
