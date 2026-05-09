import { type CalloutBlock } from 'notion-types'
import * as React from 'react'
import { PageIcon, Text } from 'react-notion-x'

import styles from './Callout.module.css'

interface CalloutProps {
  block: CalloutBlock
  blockId?: string
  className?: string
}

/**
 * 레퍼런스 서비스 풍 callout 블록.
 *
 * - 24x24 icon area (좌측) + content (우측)
 * - 옅은 회색 배경 (또는 사용자 block_color)
 * - radius 4px, padding 16px
 *
 * react-notion-x default Callout을 customComponents로 교체.
 * @see analysis/html-structure.md (레퍼런스 서비스의 CalloutBlock_container 마크업)
 */
export function Callout({ block, blockId, className }: CalloutProps) {
  const blockColor = block.format?.block_color
  const colorClass = blockColor ? `notion-${blockColor}_co` : ''
  const bgClass = blockColor ? `notion-${blockColor}_background` : ''

  return (
    <div
      id={blockId}
      className={`${styles.container} notion-callout ${colorClass} ${bgClass} ${className ?? ''}`}
    >
      <div className={styles.icon}>
        {block.format?.page_icon && <PageIcon block={block} defaultIcon='💡' />}
      </div>
      <div className={styles.content}>
        <Text value={block.properties?.title} block={block} />
      </div>
    </div>
  )
}
