import { IoCloseOutline } from '@react-icons/all-files/io5/IoCloseOutline'
import { useRouter } from 'next/router'
import * as React from 'react'

import { popupOptions, popups } from '@/lib/config'

const DISMISS_KEY_PREFIX = 'folio-popup-dismissed:'

function isDismissed(id: string): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY_PREFIX + id) === '1'
  } catch {
    // localStorage를 못 쓰는 환경(프라이빗 모드 등)에서는 매번 보여준다
    return false
  }
}

function rememberDismissal(id: string) {
  try {
    window.localStorage.setItem(DISMISS_KEY_PREFIX + id, '1')
  } catch {
    // 기억하지 못해도 이번 세션은 닫힌 상태로 둔다
  }
}

/**
 * 사이트 팝업 (레퍼런스 서비스 어드민의 스타일 > 팝업 설정).
 *
 * "다시 보지 않기"를 누르면 localStorage에 팝업 id로 기록한다. 그래서 id는
 * 내용이 바뀌면 같이 바꿔야 한다(그러지 않으면 이미 닫은 사람에게 새 내용이
 * 안 보인다).
 */
export function Popups() {
  const router = useRouter()
  const [visibleIds, setVisibleIds] = React.useState<string[]>([])

  const isMainPage = router.pathname === '/'
  const shouldShow = !popupOptions.mainPageOnly || isMainPage

  // 마운트 후에 결정한다. localStorage는 서버에서 읽을 수 없어서, 서버 렌더
  // 결과와 어긋나지 않도록 처음엔 아무것도 그리지 않는다.
  React.useEffect(() => {
    if (!shouldShow) {
      setVisibleIds([])
      return
    }

    setVisibleIds(popups.filter((p) => !isDismissed(p.id)).map((p) => p.id))
  }, [shouldShow])

  const dismiss = React.useCallback((id: string, remember: boolean) => {
    if (remember) rememberDismissal(id)
    setVisibleIds((ids) => ids.filter((visible) => visible !== id))
  }, [])

  const visible = popups.filter((p) => visibleIds.includes(p.id))
  if (!visible.length) {
    return null
  }

  return (
    <div className='folio-popups'>
      {visible.map((popup) => (
        <aside key={popup.id} className='folio-popup'>
          <button
            type='button'
            className='folio-popup-close'
            onClick={() => dismiss(popup.id, false)}
            aria-label='팝업 닫기'
          >
            <IoCloseOutline />
          </button>

          <PopupBody popup={popup} />

          <button
            type='button'
            className='folio-popup-dismiss'
            onClick={() => dismiss(popup.id, true)}
          >
            다시 보지 않기
          </button>
        </aside>
      ))}
    </div>
  )
}

function PopupBody({ popup }: { popup: (typeof popups)[number] }) {
  const content = (
    <>
      {popup.image && (
        <img className='folio-popup-image' src={popup.image} alt='' />
      )}
      {popup.title && <strong className='folio-popup-title'>{popup.title}</strong>}
      {popup.body && <p className='folio-popup-text'>{popup.body}</p>}
    </>
  )

  if (!popup.href) {
    return <div className='folio-popup-body'>{content}</div>
  }

  return (
    <a
      className='folio-popup-body folio-popup-link'
      href={popup.href}
      {...(popup.newTab
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      {content}
    </a>
  )
}
