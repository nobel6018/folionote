import * as React from 'react'
import { useNotionContext } from 'react-notion-x'

/**
 * 사이트 내부 경로면 현재 탭에서, 외부 주소면 새 탭에서 연다.
 *
 * react-notion-x의 `components.Link`는 본문 속 외부 링크용이라
 * `target="_blank"`가 박혀 있다. 그걸 헤더 로고나 nav 링크에 그대로 쓰면
 * 내 사이트 안을 이동하는데도 탭이 새로 뜬다. 내부 경로는
 * `components.PageLink`(next/link로 감싸져 있다)로 보내 클라이언트 라우팅을 탄다.
 */
export function SiteLink({
  href,
  className,
  onClick,
  children
}: {
  href: string
  className?: string
  onClick?: () => void
  children: React.ReactNode
}) {
  const { components } = useNotionContext()

  // 프로토콜이 붙어 있거나(http:, mailto: …) //로 시작하면 외부로 본다.
  // 두 검사로 나눈 이유: 하나의 정규식으로 합치면 선택 그룹 안의 반복이
  // 뒤따르는 `//`와 겹쳐 백트래킹 위험(ReDoS)이 생긴다.
  const isExternal = href.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(href)

  if (isExternal) {
    return (
      <components.Link href={href} className={className} onClick={onClick}>
        {children}
      </components.Link>
    )
  }

  return (
    <components.PageLink href={href} className={className} onClick={onClick}>
      {children}
    </components.PageLink>
  )
}
