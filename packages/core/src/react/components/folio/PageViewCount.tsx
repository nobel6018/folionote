import cs from 'classnames'
import * as React from 'react'

import { useSiteConfig } from '../../site-config-context.js'

type Counts = { today: number; total: number }

/**
 * 페이지뷰 카운트 (레퍼런스 서비스 어드민의 "페이지뷰 카운트").
 *
 * 페이지가 정적으로 미리 만들어지므로 마운트 후 API를 불러 채운다. 저장소가
 * 준비되지 않았으면(Redis 미설정) 아무것도 그리지 않는다. 0을 보여주면 집계가
 * 되는 줄 오해하게 된다.
 */
export function PageViewCount({ pageId }: { pageId?: string }) {
  const { pageViewCount } = useSiteConfig()
  const [counts, setCounts] = React.useState<Counts | null>(null)
  const countedPageId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!pageViewCount.enabled || !pageId) return

    // 같은 페이지에서 effect가 두 번 돌아도(개발 모드 StrictMode) 한 번만 센다
    if (countedPageId.current === pageId) return
    countedPageId.current = pageId

    const controller = new AbortController()

    const count = async () => {
      try {
        const res = await fetch(
          `/api/pageview?pageId=${encodeURIComponent(pageId)}`,
          { method: 'POST', signal: controller.signal }
        )
        if (!res.ok) return

        const data = (await res.json()) as Counts
        if (typeof data?.today === 'number') {
          setCounts(data)
        }
      } catch {
        // 카운터는 부가 기능이다. 실패하면 조용히 아무것도 그리지 않는다
      }
    }

    void count()

    return () => controller.abort()
  }, [pageId, pageViewCount.enabled])

  if (!pageViewCount.enabled || !counts) {
    return null
  }

  return (
    <div
      className={cs('folio-pageview', `folio-pageview-${pageViewCount.style}`)}
    >
      <span className='folio-pageview-label'>Today</span>
      <span className='folio-pageview-value'>
        {counts.today.toLocaleString()}
      </span>
    </div>
  )
}
