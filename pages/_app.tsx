// 렌더러가 쓰는 CSS 전부. katex, prism, react-notion-x 기본값과 우리 토큰까지
// 한 파일에 순서대로 들어 있다 (@see packages/core/styles/styles.css).
// 이 줄보다 뒤에 임포트한 CSS만 여기 규칙을 덮는다.
import '@folionote/core/styles.css'

import type { AppProps } from 'next/app'
import {
  bootstrap,
  CustomThemeStyles,
  FontStyles,
  SiteConfigProvider
} from '@folionote/core'
import { type ResolvedSiteConfig } from '@folionote/core/config'
import * as Fathom from 'fathom-client'
import { useRouter } from 'next/router'
import { ThemeProvider } from 'next-themes'
import { posthog } from 'posthog-js'
import * as React from 'react'

import {
  fathomConfig,
  fathomId,
  posthogConfig,
  posthogId
} from '@/lib/analytics-env'

if (typeof window !== 'undefined') {
  bootstrap()
}

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  // 설정은 페이지가 props로 실어 보낸다. 모듈 상수로 두면 사이트 이름과 도메인이
  // 브라우저 번들에 박혀서 한 프로세스가 사이트 하나만 그릴 수 있다.
  // (@see docs/architecture.md)
  const config = pageProps.config as ResolvedSiteConfig | undefined

  const forcedTheme =
    config?.colorThemeMode === 'light' || config?.colorThemeMode === 'custom'
      ? 'light'
      : config?.colorThemeMode === 'dark'
        ? 'dark'
        : undefined

  React.useEffect(() => {
    function onRouteChangeComplete() {
      if (fathomId) {
        Fathom.trackPageview()
      }

      if (posthogId) {
        posthog.capture('$pageview')
      }
    }

    if (fathomId) {
      Fathom.load(fathomId, fathomConfig)
    }

    if (posthogId) {
      posthog.init(posthogId, posthogConfig)
    }

    router.events.on('routeChangeComplete', onRouteChangeComplete)

    return () => {
      router.events.off('routeChangeComplete', onRouteChangeComplete)
    }
  }, [router.events])

  return (
    <SiteConfigProvider config={config}>
      <ThemeProvider
        attribute='class'
        defaultTheme='system'
        enableSystem
        themes={['light', 'dark']}
        value={{ light: 'light-mode', dark: 'dark-mode' }}
        storageKey='theme'
        disableTransitionOnChange
        // light/dark로 고정한 경우 그 테마만 쓴다. custom은 다크 팔레트가 끼어들지
        // 않도록 light에 고정하고 색은 CustomThemeStyles가 덮는다.
        forcedTheme={forcedTheme}
      >
        <FontStyles />
        <CustomThemeStyles />

        <Component {...pageProps} />
      </ThemeProvider>
    </SiteConfigProvider>
  )
}
