import { IoCheckmarkOutline } from '@react-icons/all-files/io5/IoCheckmarkOutline'
import { IoShareSocialOutline } from '@react-icons/all-files/io5/IoShareSocialOutline'
import cs from 'classnames'
import * as React from 'react'

/**
 * 링크를 클립보드에 복사한다. 성공 여부를 돌려준다.
 *
 * 비동기 Clipboard API는 secure context에 사용자 조작(user activation)까지
 * 요구해서 `NotAllowedError`로 거절되는 경우가 있다. 그때는 임시 textarea와
 * `execCommand('copy')`로 한 번 더 시도한다. deprecated지만 권한 요구가 없다.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 아래 레거시 경로로 재시도
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  // 화면에 보이지 않게 두되 focus는 받을 수 있어야 한다
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  document.body.append(textarea)

  try {
    textarea.select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
  }
}

/**
 * 현재 페이지 공유 버튼 (레퍼런스 서비스 어드민의 "공유 버튼 표시").
 *
 * Web Share API가 있으면 OS 공유 시트를 띄우고, 없으면 링크를 클립보드에
 * 복사한 뒤 짧게 체크 표시를 보여준다. 데스크탑 브라우저 대부분이 navigator.share를
 * 지원하지 않아서 복사 경로가 사실상 기본 동작이다.
 */
export function ShareButton({
  className,
  showLabel = false
}: {
  className?: string
  showLabel?: boolean
}) {
  const [isCopied, setIsCopied] = React.useState(false)
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    }
  }, [])

  const onShare = React.useCallback(async () => {
    const url = window.location.href
    const title = document.title

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // 사용자가 공유 시트를 닫은 경우. 복사로 대체하지 않고 조용히 끝낸다.
        return
      }
    }

    if (await copyToClipboard(url)) {
      setIsCopied(true)
      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => setIsCopied(false), 1600)
    } else {
      // 복사에 실패했는데 "복사됨"을 띄우면 거짓말이 된다. 주소창을 쓰라고 알린다.
      window.prompt('아래 주소를 복사하세요', url)
    }
  }, [])

  return (
    <button
      type='button'
      className={cs('breadcrumb', 'button', 'folio-share-button', className)}
      onClick={onShare}
      title={isCopied ? '링크를 복사했습니다' : '이 페이지 공유하기'}
      aria-label='이 페이지 공유하기'
    >
      {isCopied ? <IoCheckmarkOutline /> : <IoShareSocialOutline />}
      {showLabel && <span>{isCopied ? '복사됨' : 'Share'}</span>}
    </button>
  )
}
