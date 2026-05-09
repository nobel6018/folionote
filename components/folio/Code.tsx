import { type CodeBlock as CodeBlockType } from 'notion-types'
import { getBlockTitle } from 'notion-utils'
import Prism from 'prismjs'
import * as React from 'react'
import { useNotionContext } from 'react-notion-x'

import styles from './Code.module.css'

interface CodeProps {
  block: CodeBlockType
  defaultLanguage?: string
  className?: string
}

/**
 * 레퍼런스 서비스 풍 코드 블록.
 *
 * - 우측 상단에 language 라벨 + copy 버튼
 * - 둥근 모서리 + surface-muted 배경
 * - Prism.js syntax highlighting (starter-kit이 임포트한 prism + prism-theme.css 활용)
 *
 * react-notion-x의 default Code 컴포넌트를 customComponents로 교체.
 * @see analysis/html-structure.md (레퍼런스 서비스의 CodeBlock 마크업 패턴)
 */
export function Code({
  block,
  defaultLanguage = 'javascript',
  className
}: CodeProps) {
  const { recordMap } = useNotionContext()
  const code = getBlockTitle(block, recordMap) ?? ''
  const language = String(
    block?.properties?.language?.[0]?.[0] ?? defaultLanguage
  ).toLowerCase()

  const [hasCopied, setHasCopied] = React.useState(false)

  const onCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setHasCopied(true)
      window.setTimeout(() => setHasCopied(false), 2000)
    } catch (err) {
      console.error('clipboard error', err)
    }
  }, [code])

  const html = React.useMemo(() => {
    try {
      const grammar = Prism.languages[language]
      if (grammar) {
        return Prism.highlight(code, grammar, language)
      }
    } catch (err) {
      console.warn('prism highlight error', err)
    }
    return escapeHtml(code)
  }, [code, language])

  return (
    <div className={`${styles.container} notion-code ${className ?? ''}`}>
      <div className={styles.header}>
        <span className={styles.language}>{language}</span>
        <button
          type='button'
          className={styles.copyButton}
          onClick={onCopy}
          aria-label={hasCopied ? 'Copied to clipboard' : 'Copy code'}
        >
          {hasCopied ? '복사됨' : 'Copy'}
        </button>
      </div>
      <pre className={`${styles.pre} language-${language}`}>
        <code
          className={`language-${language}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  )
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
