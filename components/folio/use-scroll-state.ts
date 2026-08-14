import * as React from 'react'

/**
 * 스크롤 위치를 구독한다. 스크롤/리사이즈 이벤트를 rAF로 묶어 한 프레임에 한 번만
 * 계산한다(스크롤 이벤트는 프레임보다 자주 온다).
 */
export function useScrollState() {
  const [state, setState] = React.useState({
    progress: 0,
    scrollY: 0,
    isScrollingUp: false
  })
  const lastScrollY = React.useRef(0)

  React.useEffect(() => {
    let frame: number | null = null

    const measure = () => {
      frame = null
      const scrollY = window.scrollY
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight

      // 같은 위치로 여러 번 들어올 때 방향 판단이 흔들리지 않게 1px 이상만 본다
      const delta = scrollY - lastScrollY.current
      const isScrollingUp = Math.abs(delta) < 1 ? undefined : delta < 0
      lastScrollY.current = scrollY

      setState((prev) => ({
        progress: scrollable > 0 ? Math.min(scrollY / scrollable, 1) : 0,
        scrollY,
        isScrollingUp: isScrollingUp ?? prev.isScrollingUp
      }))
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
