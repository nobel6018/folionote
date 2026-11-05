import { type Block, type ExtendedRecordMap } from 'notion-types'
import { getBlockValue, getTextContent } from 'notion-utils'

/** 설명으로 모으는 본문 블록. 제목(header 계열)은 "개요" 같은 한 단어라 뺀다 */
const TEXT_BLOCK_TYPES = new Set([
  'text',
  'quote',
  'callout',
  'bulleted_list',
  'numbered_list',
  'to_do'
])

/**
 * 페이지 설명이 없을 때 쓰는 본문 앞부분. 검색 결과와 링크 미리보기에 나간다.
 *
 * 설명 속성이 없는 글은 사이트 공통 설명으로 떨어져서, 모든 글이 같은 문구로
 * 보였다. 레퍼런스 서비스는 본문 첫 블록을 쓰는데 그게 대개 "개요" 같은 제목이라
 * 쓸모가 적다. 여기서는 제목을 건너뛰고 본문 문단을 maxLength까지 모은다.
 * 날짜, 사람 멘션은 텍스트로 '‣'만 남으므로 지운다.
 *
 * 페이지 바로 아래 블록만 본다. 다단(column_list)은 날짜와 작성자를 나란히 놓는
 * 바이라인 배치로 흔히 쓰여서, 들어가면 설명이 "2026-11-03 @이영훈"으로 시작했다.
 * 토글 안은 접혀 있는 내용이라 역시 보지 않는다.
 */
export function getPageExcerpt(
  block: Block,
  recordMap: ExtendedRecordMap,
  maxLength = 160
): string | undefined {
  const parts: string[] = []
  let length = 0

  const visit = (ids: string[] | undefined): boolean => {
    for (const id of ids ?? []) {
      const child = getBlockValue(recordMap.block[id]) as Block | undefined
      if (!child) {
        continue
      }

      if (!TEXT_BLOCK_TYPES.has(child.type)) {
        continue
      }

      const text = getTextContent((child as any).properties?.title)
        .replaceAll('‣', '')
        .replaceAll(/\s+/g, ' ')
        .trim()
      if (!text) {
        continue
      }

      parts.push(text)
      length += text.length + 1
      if (length >= maxLength) {
        return true
      }
    }
    return false
  }

  visit(block.content)

  const excerpt = parts.join(' ')
  if (!excerpt) {
    return undefined
  }
  return excerpt.length > maxLength
    ? `${excerpt.slice(0, maxLength - 1).trimEnd()}…`
    : excerpt
}
