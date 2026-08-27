import type * as types from 'notion-types'
import { IoChevronForward } from '@react-icons/all-files/io5/IoChevronForward'
import { IoCloseOutline } from '@react-icons/all-files/io5/IoCloseOutline'
import { IoDesktopOutline } from '@react-icons/all-files/io5/IoDesktopOutline'
import { IoMenuOutline } from '@react-icons/all-files/io5/IoMenuOutline'
import { IoMoonSharp } from '@react-icons/all-files/io5/IoMoonSharp'
import { IoSunnyOutline } from '@react-icons/all-files/io5/IoSunnyOutline'
import cs from 'classnames'
import { useRouter } from 'next/router'
import * as React from 'react'
import { Header, Search, useNotionContext } from 'react-notion-x'

import { useSiteConfig } from '../site-config-context.js'
import { useDarkMode } from '../use-dark-mode.js'
import { Breadcrumbs } from './folio/Breadcrumbs.js'
import { ScrollProgressBar } from './folio/ScrollProgressBar.js'
import { ShareButton } from './folio/ShareButton.js'
import { SiteLink } from './folio/SiteLink.js'
import styles from './styles.module.css'

function ToggleThemeButton() {
  const { preference, hasMounted, cycleTheme } = useDarkMode()

  const onToggleTheme = React.useCallback(() => {
    cycleTheme()
  }, [cycleTheme])

  const icon =
    preference === 'dark' ? (
      <IoMoonSharp />
    ) : preference === 'light' ? (
      <IoSunnyOutline />
    ) : (
      <IoDesktopOutline />
    )

  return (
    <div
      className={cs('breadcrumb', 'button', !hasMounted && styles.hidden)}
      onClick={onToggleTheme}
      title={`Theme: ${preference} (click to change)`}
    >
      {icon}
    </div>
  )
}

/**
 * 헤더 좌측 브랜드. `logo`가 설정돼 있으면 이미지, 없으면 사이트 이름 텍스트.
 *
 * 라이트/다크 이미지를 둘 다 그려 놓고 CSS로 전환한다. 마운트 후 `isDarkMode`를
 * 보고 src를 바꾸면 SSR 결과와 어긋나거나 첫 페인트에 잘못된 로고가 깜빡인다.
 */
function SiteBrand({ onNavigate }: { onNavigate?: () => void }) {
  const { logo, name } = useSiteConfig()

  if (!logo) {
    return (
      <SiteLink href='/' className='folio-site-name' onClick={onNavigate}>
        {name}
      </SiteLink>
    )
  }

  return (
    <SiteLink href={logo.href} className='folio-logo-link' onClick={onNavigate}>
      <img
        className='folio-logo folio-logo-light'
        src={logo.light}
        alt={logo.alt}
        style={{ height: logo.height }}
      />
      <img
        className='folio-logo folio-logo-dark'
        src={logo.dark}
        alt={logo.alt}
        style={{ height: logo.height }}
        aria-hidden={true}
      />
    </SiteLink>
  )
}

export function NotionPageHeader({
  block
}: {
  block: types.CollectionViewPageBlock | types.PageBlock
}) {
  const { components, mapPageUrl } = useNotionContext()
  const {
    isSearchEnabled,
    isShareButtonEnabled,
    isThemeToggleEnabled,
    navigationLinks,
    navigationStyle
  } = useSiteConfig()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const closeMenu = React.useCallback(() => setIsMenuOpen(false), [])
  const toggleMenu = React.useCallback(() => setIsMenuOpen((open) => !open), [])

  // 링크를 눌러 페이지가 바뀌면 드로어가 열린 채로 남지 않게 닫는다
  React.useEffect(() => {
    router.events.on('routeChangeComplete', closeMenu)
    return () => router.events.off('routeChangeComplete', closeMenu)
  }, [router.events, closeMenu])

  // 드로어가 열린 동안 배경 스크롤 방지
  React.useEffect(() => {
    if (!isMenuOpen) return

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [isMenuOpen])

  React.useEffect(() => {
    if (!isMenuOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isMenuOpen, closeMenu])

  if (navigationStyle === 'default') {
    return (
      <>
        <Header block={block} />
        <ScrollProgressBar standalone={true} />
      </>
    )
  }

  const renderNavLinks = (extraClassName?: string) =>
    navigationLinks
      ?.map((link, index) => {
        if (!link?.pageId && !link?.url) {
          return null
        }

        const isDrawerLink = !!extraClassName
        const className = cs(
          styles.navLink,
          'breadcrumb',
          'button',
          extraClassName
        )
        const children = isDrawerLink ? (
          <>
            <span>{link.title}</span>
            <IoChevronForward className='folio-menu-drawer-chevron' />
          </>
        ) : (
          link.title
        )

        if (link.pageId) {
          return (
            <components.PageLink
              href={mapPageUrl(link.pageId)}
              key={index}
              className={className}
              onClick={closeMenu}
            >
              {children}
            </components.PageLink>
          )
        }

        return (
          <SiteLink
            href={link.url!}
            key={index}
            className={className}
            onClick={closeMenu}
          >
            {children}
          </SiteLink>
        )
      })
      .filter(Boolean)

  const hasNavLinks = !!renderNavLinks()?.length

  // 레퍼런스 서비스 구조: 1행은 로고 + nav 링크 + 도구를 균등 배치, 2행은 전체 경로.
  // 좁은 화면에서는 nav 링크를 감추고 햄버거 드로어로 넘긴다.
  return (
    <header
      className={cs(
        'notion-header',
        'folio-header',
        // 드로어가 열린 동안 헤더를 스크롤 위젯 위로 올린다 (@see folio-overrides.css)
        isMenuOpen && 'folio-header-menu-open'
      )}
    >
      <div className='notion-nav-header folio-nav-row'>
        <SiteBrand />

        <div className='folio-nav-links'>{renderNavLinks()}</div>

        <div className='notion-nav-header-rhs breadcrumbs'>
          {isShareButtonEnabled && (
            <div className='folio-desktop-only'>
              <ShareButton />
            </div>
          )}

          {isThemeToggleEnabled && (
            <div className='folio-desktop-only'>
              <ToggleThemeButton />
            </div>
          )}

          {isSearchEnabled && <Search block={block} title={null} />}

          {hasNavLinks && (
            <button
              type='button'
              className='breadcrumb button folio-menu-toggle'
              onClick={toggleMenu}
              aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <IoCloseOutline /> : <IoMenuOutline />}
            </button>
          )}
        </div>
      </div>

      <div className='folio-breadcrumb-row'>
        <Breadcrumbs block={block} />
      </div>

      {/* 헤더 안에 둔다. 밖에 두면 러버밴드 오버스크롤에서 헤더만 밀려 올라가
          바가 떨어져 보인다 (@see ScrollProgressBar) */}
      <ScrollProgressBar />

      {isMenuOpen && (
        <>
          <div className='folio-menu-backdrop' onClick={closeMenu} />

          {/* 레퍼런스 서비스 실측: 우측에서 열리는 사이드 패널(뷰포트 80%, 최대 312px, 전체 높이).
              상단에 테마 토글과 닫기, 아래에 좌측 정렬 링크 + 셰브론. */}
          <nav className='folio-menu-drawer' aria-label='사이트 메뉴'>
            {/* 레퍼런스 서비스 드로어 상단: 좌측에 공유 + 테마, 우측에 닫기 */}
            <div className='folio-menu-drawer-header'>
              <div className='folio-menu-drawer-tools'>
                {isShareButtonEnabled && <ShareButton showLabel={true} />}
                {isThemeToggleEnabled && <ToggleThemeButton />}
              </div>

              <button
                type='button'
                className='folio-menu-drawer-close'
                onClick={closeMenu}
                aria-label='메뉴 닫기'
              >
                <IoCloseOutline />
              </button>
            </div>

            {renderNavLinks('folio-menu-drawer-link')}
          </nav>
        </>
      )}
    </header>
  )
}
