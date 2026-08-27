import * as React from 'react'

import { Prism } from '../react/prism-languages.js'
import styles from './Admin.module.css'

/**
 * 코드 뷰어 배색.
 *
 * CSS 모듈에서 테마별 클래스를 만들면 이름을 동적으로 조합해야 해서 지저분해진다.
 * 대신 값을 CSS 변수로 인라인 주입하고, 스타일시트는 그 변수만 읽는다.
 */
export type CodeTheme = {
  id: string
  label: string
  bg: string
  fg: string
  gutterBg: string
  gutterFg: string
  border: string
  comment: string
  string: string
  number: string
  keyword: string
  function: string
  punctuation: string
  /** 드래그 선택 배경. prism 기본값(#b3d4fc)은 어두운 테마에서 안 읽힌다 */
  selection: string
}

export const CODE_THEMES: CodeTheme[] = [
  {
    id: 'github-light',
    label: 'GitHub Light',
    bg: '#ffffff',
    fg: '#24292f',
    gutterBg: '#f6f8fa',
    gutterFg: '#8c959f',
    border: '#e2e7eb',
    comment: '#6e7781',
    string: '#0a3069',
    number: '#0550ae',
    keyword: '#cf222e',
    function: '#8250df',
    punctuation: '#57606a',
    selection: 'rgba(84, 174, 255, 0.32)'
  },
  {
    id: 'github-dark',
    label: 'GitHub Dark',
    bg: '#0d1117',
    fg: '#c9d1d9',
    gutterBg: '#161b22',
    gutterFg: '#6e7681',
    border: '#30363d',
    comment: '#8b949e',
    string: '#a5d6ff',
    number: '#79c0ff',
    keyword: '#ff7b72',
    function: '#d2a8ff',
    punctuation: '#8b949e',
    selection: 'rgba(56, 139, 253, 0.42)'
  },
  {
    id: 'dracula',
    label: 'Dracula',
    bg: '#282a36',
    fg: '#f8f8f2',
    gutterBg: '#21222c',
    gutterFg: '#6272a4',
    border: '#44475a',
    comment: '#6272a4',
    string: '#f1fa8c',
    number: '#bd93f9',
    keyword: '#ff79c6',
    function: '#50fa7b',
    punctuation: '#f8f8f2',
    selection: 'rgba(189, 147, 249, 0.38)'
  },
  {
    id: 'monokai',
    label: 'Monokai',
    bg: '#272822',
    fg: '#f8f8f2',
    gutterBg: '#211f1c',
    gutterFg: '#75715e',
    border: '#3e3d32',
    comment: '#75715e',
    string: '#e6db74',
    number: '#ae81ff',
    keyword: '#f92672',
    function: '#a6e22e',
    punctuation: '#f8f8f2',
    selection: 'rgba(174, 129, 255, 0.35)'
  },
  {
    id: 'solarized-light',
    label: 'Solarized Light',
    bg: '#fdf6e3',
    fg: '#657b83',
    gutterBg: '#f5eed8',
    gutterFg: '#93a1a1',
    border: '#e6dcc1',
    comment: '#93a1a1',
    string: '#2aa198',
    number: '#d33682',
    keyword: '#859900',
    function: '#268bd2',
    punctuation: '#657b83',
    selection: 'rgba(38, 139, 210, 0.24)'
  },
  {
    id: 'nord',
    label: 'Nord',
    bg: '#2e3440',
    fg: '#d8dee9',
    gutterBg: '#292e39',
    gutterFg: '#616e88',
    border: '#3b4252',
    comment: '#616e88',
    string: '#a3be8c',
    number: '#b48ead',
    keyword: '#81a1c1',
    function: '#88c0d0',
    punctuation: '#d8dee9',
    selection: 'rgba(136, 192, 208, 0.32)'
  }
]

const STORAGE_KEY = 'folionote-admin-code-theme'

/** 고른 배색을 기억한다. 들어올 때마다 다시 고르게 하지 않는다 */
export function useCodeTheme() {
  const [themeId, setThemeId] = React.useState(CODE_THEMES[0]!.id)

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && CODE_THEMES.some((t) => t.id === saved)) setThemeId(saved)
  }, [])

  const select = React.useCallback((id: string) => {
    setThemeId(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  return { themeId, select }
}

/**
 * 생성된 `site.config.ts`를 하이라이팅 + 줄 번호로 보여준다.
 *
 * 줄 번호는 별도 열에 숫자를 나열해 그린다. 그래서 **줄바꿈을 금지해야** 한다.
 * 본문이 한 줄에서 두 줄로 접히면 번호 열과 코드 열의 행 높이가 어긋나 번호가
 * 실제 줄과 맞지 않게 된다. `white-space: pre` + 가로 스크롤로 둔다.
 *
 * 번호 열은 sticky left라 가로로 스크롤해도 남아 있는다.
 *
 * Prism 문법은 react/prism-languages.ts가 등록해 둔다(prism-typescript 포함).
 * @see pages/admin.tsx
 */
function CodeViewImpl({
  source,
  themeId
}: {
  source: string
  themeId: string
}) {
  const html = React.useMemo(() => {
    if (!source) return ''
    const grammar = Prism.languages.typescript || Prism.languages.javascript
    // grammar가 없으면 하이라이팅 없이 그대로 보여준다. Prism.highlight는
    // 출력에서 HTML을 escape하므로 설정값에 <가 들어가도 안전하다.
    if (!grammar) {
      return source.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    }
    return Prism.highlight(source, grammar, 'typescript')
  }, [source])

  const lineCount = React.useMemo(
    () => (source ? source.split('\n').length : 0),
    [source]
  )

  const gutter = React.useMemo(
    () => Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n'),
    [lineCount]
  )

  const theme = CODE_THEMES.find((t) => t.id === themeId) || CODE_THEMES[0]!

  const vars = {
    '--code-bg': theme.bg,
    '--code-fg': theme.fg,
    '--code-gutter-bg': theme.gutterBg,
    '--code-gutter-fg': theme.gutterFg,
    '--code-border': theme.border,
    '--code-comment': theme.comment,
    '--code-string': theme.string,
    '--code-number': theme.number,
    '--code-keyword': theme.keyword,
    '--code-function': theme.function,
    '--code-punctuation': theme.punctuation,
    '--code-selection': theme.selection
  } as React.CSSProperties

  return (
    <div className={styles.codeScroll} style={vars}>
      <div className={styles.codeGrid}>
        <pre className={styles.codeGutter} aria-hidden='true'>
          {gutter}
        </pre>
        <pre className={styles.codeBody}>
          <code
            className='language-typescript'
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>
      </div>
    </div>
  )
}

/**
 * source와 배색이 그대로면 다시 그리지 않는다.
 *
 * 부모가 다른 이유로 리렌더될 때마다 dangerouslySetInnerHTML이 DOM을 새로
 * 만들고, 그러면 사용자가 드래그로 잡아둔 선택이 풀린다.
 */
export const CodeView = React.memo(CodeViewImpl)

/** 배색 고르는 select. 코드 보기 위에 놓는다 */
export function CodeThemeSelect({
  themeId,
  onChange
}: {
  themeId: string
  onChange: (id: string) => void
}) {
  return (
    <label className={styles.codeToolbar}>
      <span className={styles.codeToolbarLabel}>코드 배색</span>
      <select
        className={`${styles.input} ${styles.codeThemeSelect}`}
        value={themeId}
        onChange={(e) => onChange(e.target.value)}
      >
        {CODE_THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  )
}
