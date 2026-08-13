import Prism from 'prismjs'
import * as React from 'react'

import styles from './Admin.module.css'

/**
 * 생성된 `site.config.ts`를 하이라이팅 + 줄 번호로 보여준다.
 *
 * 줄 번호는 별도 열에 숫자를 나열해 그린다. 그래서 **줄바꿈을 금지해야** 한다.
 * 본문이 한 줄에서 두 줄로 접히면 번호 열과 코드 열의 행 높이가 어긋나 번호가
 * 실제 줄과 맞지 않게 된다. `white-space: pre` + 가로 스크롤로 둔다.
 *
 * 번호 열은 sticky left라 가로로 스크롤해도 남아 있는다.
 *
 * Prism 문법은 _app.tsx에서 이미 등록된다(prism-typescript 포함).
 * @see pages/admin.tsx
 */
function CodeViewImpl({ source }: { source: string }) {
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
    () =>
      Array.from({ length: lineCount }, (_, i) => String(i + 1)).join('\n'),
    [lineCount]
  )

  return (
    <div className={styles.codeScroll}>
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
 * source가 그대로면 다시 그리지 않는다.
 *
 * 부모가 다른 이유로 리렌더될 때마다 dangerouslySetInnerHTML이 DOM을 새로
 * 만들고, 그러면 사용자가 드래그로 잡아둔 선택이 풀린다.
 */
export const CodeView = React.memo(CodeViewImpl)
