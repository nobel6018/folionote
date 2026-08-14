import cs from 'classnames'
import * as React from 'react'

import { scrollProgressBar } from '@/lib/config'

import { useScrollState } from './use-scroll-state'

function ScrollProgressBarBody({ standalone }: { standalone?: boolean }) {
  const { progress } = useScrollState()

  return (
    <div
      className={cs(
        'folio-scroll-progress',
        standalone && 'folio-scroll-progress-standalone'
      )}
      aria-hidden={true}
    >
      <div
        className='folio-scroll-progress-fill'
        style={{
          transform: `scaleX(${progress})`,
          background: scrollProgressBar.color
        }}
      />
    </div>
  )
}

/**
 * 페이지 상단의 읽기 진행률 바 (레퍼런스 서비스 어드민의 "스크롤 프로그레스 바").
 *
 * 레퍼런스 서비스와 같은 구조로 sticky 헤더 **안에** 절대 배치한다(레퍼런스 사이트 실측: 높이
 * 90px인 sticky 헤더 안의 `position: absolute` 요소). macOS에서 문서 끝을 지나
 * 더 스크롤하면(러버밴드) sticky 헤더는 본문과 함께 밀려 올라가는데, 바가
 * `position: fixed`면 제자리에 남아 헤더에서 떨어져 허공에 떠 보인다.
 *
 * `standalone`은 `navigationStyle: 'default'`용이다. react-notion-x 기본 헤더에는
 * 자식을 넣을 수 없으므로 sticky로 같은 스크롤 컨텐츠에 얹어 함께 움직이게 한다.
 *
 * 끄기 판정을 밖에서 하는 이유: 안에서 하면 바를 쓰지 않는 사이트에서도 스크롤
 * 구독이 걸린다.
 */
export function ScrollProgressBar({ standalone }: { standalone?: boolean }) {
  if (!scrollProgressBar.enabled) {
    return null
  }

  return <ScrollProgressBarBody standalone={standalone} />
}
