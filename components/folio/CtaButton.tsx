import * as React from 'react'

import { cta } from '@/lib/config'

/**
 * 화면 하단에 떠 있는 CTA 버튼 (레퍼런스 서비스 어드민의 스타일 > CTA 버튼).
 *
 * 어드민 항목 대응: 버튼 내용, 링크, 하단 공백, 색상(단일/그라데이션), 새 탭.
 * "CTA 클릭 이벤트 측정"은 사이트에 붙인 분석 도구가 링크 클릭을 잡으므로
 * 별도 계측 코드를 넣지 않았다.
 */
export function CtaButton() {
  if (!cta) {
    return null
  }

  const background = cta.gradient
    ? `linear-gradient(90deg, ${cta.gradient[0]}, ${cta.gradient[1]})`
    : cta.background

  return (
    <div className='folio-cta' style={{ bottom: cta.bottomOffset }}>
      <a
        className='folio-cta-button'
        href={cta.href}
        style={{
          background,
          color: cta.color,
          boxShadow: `0 2px 8px ${cta.shadowColor}`
        }}
        {...(cta.newTab
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
      >
        {cta.text}
      </a>
    </div>
  )
}
