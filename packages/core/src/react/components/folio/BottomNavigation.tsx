import { useRouter } from 'next/router'
import * as React from 'react'
import { cs, useNotionContext } from 'react-notion-x'

import { useSiteConfig } from '@/lib/site-config-context'

import { SiteLink } from './SiteLink'

/**
 * 모바일 하단 탭바 (레퍼런스 서비스 어드민의 스타일 > 하단 네비게이터, PRO 기능).
 *
 * 좁은 화면에서만 보인다. 현재 경로와 일치하는 항목을 지정한 색으로 강조한다.
 */
export function BottomNavigation() {
  const { components, mapPageUrl } = useNotionContext()
  const router = useRouter()
  const { bottomNavigation } = useSiteConfig()

  if (!bottomNavigation) {
    return null
  }

  const currentPath = router.asPath.split('?')[0]!.replace(/\/$/, '')

  return (
    <nav
      className='folio-bottom-nav'
      style={
        {
          '--folio-bottom-nav-active-color': bottomNavigation.color
        } as React.CSSProperties
      }
      aria-label='하단 메뉴'
    >
      {bottomNavigation.links.map((link, index) => {
        const href = link.pageId ? mapPageUrl(link.pageId) : link.url!
        const isActive = href.replace(/\/$/, '') === currentPath

        const children = (
          <>
            {link.icon && (
              <span className='folio-bottom-nav-icon'>{link.icon}</span>
            )}
            <span className='folio-bottom-nav-label'>{link.title}</span>
          </>
        )

        const className = cs(
          'folio-bottom-nav-item',
          isActive && 'folio-bottom-nav-item-active'
        )

        if (link.pageId) {
          return (
            <components.PageLink href={href} key={index} className={className}>
              {children}
            </components.PageLink>
          )
        }

        return (
          <SiteLink href={href} key={index} className={className}>
            {children}
          </SiteLink>
        )
      })}
    </nav>
  )
}
