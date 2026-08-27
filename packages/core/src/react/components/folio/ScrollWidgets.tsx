import { IoArrowUpOutline } from '@react-icons/all-files/io5/IoArrowUpOutline'
import cs from 'classnames'
import * as React from 'react'

import { useSiteConfig } from '../../site-config-context.js'
import { useScrollState } from './use-scroll-state.js'

/**
 * 맨 위로 버튼 (레퍼런스 서비스 어드민의 "페이지 맨 위로 버튼").
 *
 * 읽기 진행률 바는 헤더 안에 들어가야 해서 ScrollProgressBar로 분리했다.
 * @see ScrollProgressBar
 */
export function ScrollWidgets() {
  const { backToTop } = useSiteConfig()
  const { scrollY, isScrollingUp } = useScrollState()

  // 레퍼런스 서비스 동작: 위로 스크롤할 때만 올라오고, 아래로 내리거나 최상단에서는 숨는다.
  // 모바일에서 늘 떠 있으면 본문을 가리기 때문이다.
  const isBackToTopVisible = isScrollingUp && scrollY > backToTop.showAfter

  const onBackToTop = React.useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  if (!backToTop.enabled) {
    return null
  }

  return (
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
      <span className='folio-back-to-top-label'>TOP</span>
    </button>
  )
}
