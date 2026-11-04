import * as React from 'react'

import { useSiteConfig } from '../../site-config-context.js'

const UTTERANCES_ORIGIN = 'https://utteranc.es'

/**
 * 글 하단 댓글 (utterances). `comments.utterances.repo`가 있을 때만 그린다.
 *
 * utterances는 스크립트가 자기 위치에 iframe을 꽂는 방식이다. 서버 렌더링한
 * `<script>`는 클라이언트 라우팅으로 글을 옮겨 다닐 때 다시 실행되지 않으므로,
 * 마운트할 때 스크립트 요소를 직접 만들어 붙인다. `document.createElement`로
 * 만든 스크립트는 `innerHTML`과 달리 브라우저가 실행한다.
 *
 * 테마는 처음 붙일 때 정하고, 이후 다크 모드 전환은 iframe에 메시지로 알린다.
 * 다시 붙이면 iframe이 새로 떠서 입력 중이던 댓글이 날아간다.
 */
export function Comments({
  pageId,
  isDarkMode
}: {
  pageId: string
  isDarkMode: boolean
}) {
  const config = useSiteConfig()
  const utterances = config.comments?.utterances
  const containerRef = React.useRef<HTMLDivElement>(null)
  const theme = isDarkMode ? 'github-dark' : 'github-light'
  const themeRef = React.useRef(theme)
  themeRef.current = theme

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !utterances) {
      return
    }

    const script = document.createElement('script')
    script.src = `${UTTERANCES_ORIGIN}/client.js`
    script.async = true
    script.crossOrigin = 'anonymous'
    script.setAttribute('repo', utterances.repo)
    script.setAttribute('issue-term', utterances.issueTerm ?? 'pathname')
    script.setAttribute('theme', themeRef.current)
    if (utterances.label) {
      script.setAttribute('label', utterances.label)
    }
    container.append(script)

    return () => {
      container.replaceChildren()
    }
  }, [pageId, utterances])

  React.useEffect(() => {
    const iframe = containerRef.current?.querySelector<HTMLIFrameElement>(
      'iframe.utterances-frame'
    )
    iframe?.contentWindow?.postMessage(
      { type: 'set-theme', theme },
      UTTERANCES_ORIGIN
    )
  }, [theme])

  if (!utterances) {
    return null
  }

  return <div className='folio-comments' ref={containerRef} />
}
