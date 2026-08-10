import { IoArrowUpOutline } from '@react-icons/all-files/io5/IoArrowUpOutline'
import cs from 'classnames'
import * as React from 'react'

import { backToTop, scrollProgressBar } from '@/lib/config'

/**
 * 스크롤 위치를 구독한다. 스크롤/리사이즈 이벤트를 rAF로 묶어 한 프레임에 한 번만
 * 계산한다(스크롤 이벤트는 프레임보다 자주 온다).
 */
function useScrollState() {
  const [state, setState] = React.useState({ progress: 0, scrollY: 0 })

  React.useEffect(() => {
    let frame: number | null = null

    const measure = () => {
      frame = null
      const scrollY = window.scrollY
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight
      setState({
        progress: scrollable > 0 ? Math.min(scrollY / scrollable, 1) : 0,
        scrollY
      })
    }

    const onScroll = () => {
      if (frame === null) {
        frame = window.requestAnimationFrame(measure)
      }
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return state
}

/**
 * 페이지 상단의 읽기 진행률 바 + 맨 위로 버튼
 * (레퍼런스 서비스 어드민의 "스크롤 프로그레스 바", "페이지 맨 위로 버튼").
 *
 * 둘 다 스크롤 상태 하나만 쓰므로 한 컴포넌트에서 구독을 공유한다.
 */
export function ScrollWidgets() {
  const { progress, scrollY } = useScrollState()

  const isBackToTopVisible = scrollY > backToTop.showAfter

  const onBackToTop = React.useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  if (!scrollProgressBar.enabled && !backToTop.enabled) {
    return null
  }

  return (
    <>
      {scrollProgressBar.enabled && (
        <div className='folio-scroll-progress' aria-hidden={true}>
          <div
            className='folio-scroll-progress-fill'
            style={{
              transform: `scaleX(${progress})`,
              background: scrollProgressBar.color
            }}
          />
        </div>
      )}

      {backToTop.enabled && (
        <button
          type='button'
          className={cs(
            'folio-back-to-top',
            backToTop.position === 'left'
              ? 'folio-back-to-top-left'
              : 'folio-back-to-top-right',
            // 본문 폭에 맞춰 붙일지, 화면 끝에 붙일지 (어드민 "화면 너비에 맞추기")
            backToTop.fitToContent && 'folio-back-to-top-fit',
            !isBackToTopVisible && 'folio-back-to-top-hidden'
          )}
          // 하단 여백을 CSS 변수로 넘긴다. 인라인 bottom으로 박으면 하단 탭바가
          // 있을 때 CSS에서 그만큼 밀어올릴 수 없다.
          style={
            {
              '--folio-back-to-top-bottom': `${backToTop.bottomOffset}px`,
              [backToTop.position === 'left' ? 'marginLeft' : 'marginRight']:
                backToTop.sideOffset
            } as React.CSSProperties
          }
          onClick={onBackToTop}
          aria-label='맨 위로'
          // 숨겨진 동안 키보드 포커스가 잡히지 않게 한다
          tabIndex={isBackToTopVisible ? 0 : -1}
        >
          <IoArrowUpOutline />
        </button>
      )}
    </>
  )
}
