import type * as types from 'notion-types'
import { IoDesktopOutline } from '@react-icons/all-files/io5/IoDesktopOutline'
import { IoMoonSharp } from '@react-icons/all-files/io5/IoMoonSharp'
import { IoSunnyOutline } from '@react-icons/all-files/io5/IoSunnyOutline'
import cs from 'classnames'
import * as React from 'react'
import { Header, Search, useNotionContext } from 'react-notion-x'

import {
  isSearchEnabled,
  name,
  navigationLinks,
  navigationStyle
} from '@/lib/config'
import { useDarkMode } from '@/lib/use-dark-mode'

import { Breadcrumbs } from './folio/Breadcrumbs'
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

export function NotionPageHeader({
  block
}: {
  block: types.CollectionViewPageBlock | types.PageBlock
}) {
  const { components, mapPageUrl } = useNotionContext()

  if (navigationStyle === 'default') {
    return <Header block={block} />
  }

  const navLinks = navigationLinks
    ?.map((link, index) => {
      if (!link?.pageId && !link?.url) {
        return null
      }

      const className = cs(styles.navLink, 'breadcrumb', 'button')

      if (link.pageId) {
        return (
          <components.PageLink
            href={mapPageUrl(link.pageId)}
            key={index}
            className={className}
          >
            {link.title}
          </components.PageLink>
        )
      }

      return (
        <components.Link href={link.url} key={index} className={className}>
          {link.title}
        </components.Link>
      )
    })
    .filter(Boolean)

  // 레퍼런스 서비스 구조: 1행은 사이트 이름 + nav 링크 + 도구를 균등 배치, 2행은 전체 경로.
  return (
    <header className='notion-header folio-header'>
      <div className='notion-nav-header folio-nav-row'>
        <components.Link href='/' className='folio-site-name'>
          {name}
        </components.Link>

        {navLinks}

        <div className='notion-nav-header-rhs breadcrumbs'>
          <ToggleThemeButton />

          {isSearchEnabled && <Search block={block} title={null} />}
        </div>
      </div>

      <div className='folio-breadcrumb-row'>
        <Breadcrumbs block={block} />
      </div>
    </header>
  )
}
