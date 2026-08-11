import { IoCheckmarkOutline } from '@react-icons/all-files/io5/IoCheckmarkOutline'
import { IoCopyOutline } from '@react-icons/all-files/io5/IoCopyOutline'
import { type CodeBlock as CodeBlockType } from 'notion-types'
import { getBlockTitle } from 'notion-utils'
import Prism from 'prismjs'
import * as React from 'react'
import { useNotionContext } from 'react-notion-x'

import { language as siteLanguage } from '@/lib/config'

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

  // Notion이 저장한 표기("TypeScript")를 라벨에 그대로 쓴다. 레퍼런스 서비스도 그렇게 보여준다.
  // Prism 문법 키는 소문자여야 하므로 둘을 나눠 둔다.
  const languageLabel = String(
    block?.properties?.language?.[0]?.[0] ?? defaultLanguage
  )
  const language = languageLabel.toLowerCase()

  // 버튼 라벨은 사이트 언어를 따른다 (레퍼런스 서비스도 사이트 언어로 보여준다)
  const copyLabels = siteLanguage.startsWith('ko')
    ? { idle: '복사', done: '복사됨' }
    : { idle: 'Copy', done: 'Copied' }

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
      {/* 레퍼런스 서비스와 같은 배치: 언어는 좌측 상단(Notion에 저장된 표기 그대로),
          복사 버튼은 우측 상단에 아이콘 + 라벨 */}
      <div className={styles.header}>
        <span className={styles.language}>{languageLabel}</span>
        <button
          type='button'
          className={styles.copyButton}
          onClick={onCopy}
          aria-label={hasCopied ? '코드를 복사했습니다' : '코드 복사'}
        >
          {hasCopied ? <IoCheckmarkOutline /> : <IoCopyOutline />}
          <span>{hasCopied ? copyLabels.done : copyLabels.idle}</span>
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
