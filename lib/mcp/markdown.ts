import { type Decoration, type ExtendedRecordMap } from 'notion-types'
import { getBlockValue } from 'notion-utils'

/**
 * Notion recordMap을 markdown으로 옮긴다. MCP `get_page`가 AI에게 본문을 건넬 때 쓴다.
 *
 * 화면 렌더(react-notion-x)와 똑같을 필요는 없다. 읽는 쪽이 사람이 아니라 모델이라
 * 구조(제목, 목록, 인용, 코드)와 링크만 살리면 된다. 모르는 블록은 버리지 않고
 * `[type]` 표시를 남긴다. 조용히 빠지면 "본문이 이상하다"는 진단이 틀어진다.
 *
 * @see docs/mcp.md
 */

const MAX_DEPTH = 12

export function recordMapToMarkdown(
  recordMap: ExtendedRecordMap,
  pageId: string
): string {
  const page = getBlock(recordMap, pageId)
  if (!page) {
    return ''
  }

  const lines: string[] = []
  renderChildren(recordMap, page, 0, '', lines)

  // 빈 줄이 셋 이상 이어지면 하나로 줄인다
  return lines
    .join('\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim()
}

function getBlock(recordMap: ExtendedRecordMap, id: string): any {
  const record = recordMap.block?.[id]
  return record ? (getBlockValue(record as any) as any) : undefined
}

function renderChildren(
  recordMap: ExtendedRecordMap,
  parent: any,
  depth: number,
  indent: string,
  lines: string[]
) {
  if (depth > MAX_DEPTH) {
    return
  }

  let numbered = 0

  for (const childId of (parent.content as string[] | undefined) ?? []) {
    const block = getBlock(recordMap, childId)
    if (!block || block.alive === false) {
      continue
    }

    numbered = block.type === 'numbered_list' ? numbered + 1 : 0
    renderBlock(recordMap, block, depth, indent, numbered, lines)
  }
}

function renderBlock(
  recordMap: ExtendedRecordMap,
  block: any,
  depth: number,
  indent: string,
  numbered: number,
  lines: string[]
) {
  const text = decorationsToMarkdown(block.properties?.title)
  const child = (nextIndent = indent) =>
    renderChildren(recordMap, block, depth + 1, nextIndent, lines)

  switch (block.type) {
    case 'text':
      lines.push(indent + text, '')
      child()
      return
    case 'header':
      lines.push(`# ${text}`, '')
      child()
      return
    case 'sub_header':
      lines.push(`## ${text}`, '')
      child()
      return
    case 'sub_sub_header':
      lines.push(`### ${text}`, '')
      child()
      return
    case 'bulleted_list':
      lines.push(`${indent}- ${text}`)
      child(indent + '  ')
      return
    case 'numbered_list':
      lines.push(`${indent}${numbered}. ${text}`)
      child(indent + '   ')
      return
    case 'to_do': {
      const checked = block.properties?.checked?.[0]?.[0] === 'Yes'
      lines.push(`${indent}- [${checked ? 'x' : ' '}] ${text}`)
      child(indent + '  ')
      return
    }
    case 'toggle':
      lines.push(`${indent}- ▸ ${text}`)
      child(indent + '  ')
      return
    case 'quote':
      lines.push(`${indent}> ${text}`, '')
      child()
      return
    case 'callout': {
      const icon = block.format?.page_icon
      const prefix = icon && !icon.startsWith('http') ? `${icon} ` : ''
      lines.push(`${indent}> ${prefix}${text}`, '')
      child()
      return
    }
    case 'code': {
      const language = block.properties?.language?.[0]?.[0] ?? ''
      const code = plainText(block.properties?.title)
      // 본문에 ```가 있으면 바깥 울타리를 더 길게 둔다
      const fence = '`'.repeat(Math.max(3, longestBacktickRun(code) + 1))
      lines.push(`${fence}${language.toLowerCase()}`, code, fence, '')
      return
    }
    case 'equation':
      lines.push('$$', plainText(block.properties?.title), '$$', '')
      return
    case 'divider':
      lines.push('---', '')
      return
    case 'column_list':
    case 'column':
    case 'transclusion_container':
    case 'transclusion_reference':
      child()
      return
    case 'image':
    case 'video':
    case 'audio':
    case 'file':
    case 'pdf': {
      const source = recordMap.signed_urls?.[block.id] ?? sourceOf(block)
      const caption = decorationsToMarkdown(block.properties?.caption)
      const label = caption || plainText(block.properties?.title) || block.type
      lines.push(
        block.type === 'image'
          ? `${indent}![${label}](${source})`
          : `${indent}[${block.type}: ${label}](${source})`,
        ''
      )
      return
    }
    case 'bookmark':
    case 'embed': {
      const link = sourceOf(block)
      const title = plainText(block.properties?.title) || link
      lines.push(`${indent}[${title}](${link})`, '')
      return
    }
    case 'page':
      lines.push(`${indent}- 하위 페이지: ${text} (\`${block.id}\`)`)
      return
    case 'collection_view':
    case 'collection_view_page':
      lines.push(`${indent}- 데이터베이스 (\`${block.id}\`)`, '')
      return
    case 'table':
      renderTable(recordMap, block, lines)
      return
    default:
      lines.push(`${indent}[${block.type}]${text ? ` ${text}` : ''}`, '')
      child()
  }
}

function renderTable(
  recordMap: ExtendedRecordMap,
  table: any,
  lines: string[]
) {
  const order: string[] = table.format?.table_block_column_order ?? []
  const rows = ((table.content as string[] | undefined) ?? [])
    .map((id) => getBlock(recordMap, id))
    .filter(Boolean)

  if (order.length === 0 || rows.length === 0) {
    return
  }

  const cells = rows.map((row: any) =>
    order.map((col) =>
      decorationsToMarkdown(row.properties?.[col]).replaceAll('|', '\\|')
    )
  )

  lines.push(`| ${cells[0]!.join(' | ')} |`)
  lines.push(`| ${order.map(() => '---').join(' | ')} |`)
  for (const row of cells.slice(1)) {
    lines.push(`| ${row.join(' | ')} |`)
  }
  lines.push('')
}

function sourceOf(block: any): string {
  return (
    block.format?.display_source ?? block.properties?.source?.[0]?.[0] ?? ''
  )
}

function plainText(decorations: Decoration[] | undefined): string {
  return (decorations ?? []).map(([text]) => text).join('')
}

/** 굵게, 기울임, 코드, 취소선, 링크만 옮긴다. 색과 밑줄은 모델에게 의미가 없다 */
export function decorationsToMarkdown(
  decorations: Decoration[] | undefined
): string {
  return (decorations ?? [])
    .map(([text, formats]) => {
      let out = text
      for (const format of (formats as any[] | undefined) ?? []) {
        switch (format[0]) {
          case 'b':
            out = `**${out}**`
            break
          case 'i':
            out = `*${out}*`
            break
          case 'c':
            out = `\`${out}\``
            break
          case 's':
            out = `~~${out}~~`
            break
          case 'a':
            out = `[${out}](${format[1]})`
            break
        }
      }
      return out
    })
    .join('')
}

function longestBacktickRun(text: string): number {
  return Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length))
}
