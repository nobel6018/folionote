// used for rendering equations (optional)
import 'katex/dist/katex.min.css'
// Prism core를 먼저 등록해야 syntax components의 global Prism 참조 동작
import 'prismjs'
// used for code syntax highlighting (optional)
import 'prismjs/themes/prism-coy.css'
// Prism syntax 정적 등록 — FolioCode가 직접 Prism 쓰니까 사용 언어 미리 등록.
// starter-kit이 dynamic으로 lazy-load하던 걸 우리는 static으로 바꿔
// SSR 시점에 syntax highlighting 동작 보장. 추가 언어가 필요하면 여기에.
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-coffeescript'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-docker'
import 'prismjs/components/prism-git'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-graphql'
import 'prismjs/components/prism-handlebars'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-js-templates'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-less'
import 'prismjs/components/prism-makefile'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-objectivec'
import 'prismjs/components/prism-ocaml'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-reason'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sass'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-solidity'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-stylus'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-wasm'
import 'prismjs/components/prism-yaml'
// core styles shared by all of react-notion-x (required)
import 'react-notion-x/src/styles.css'
// 폰트 임베드 (Pretendard) — 토큰보다 먼저 로드해야 @font-face가 토큰에 적용됨
import 'styles/fonts.css'
// 레퍼런스 서비스 디자인 토큰 — react-notion-x 변수보다 먼저 로드해서 override
import 'styles/folio-tokens.css'
// global styles shared across the entire site
import 'styles/global.css'
// this might be better for dark mode
// import 'prismjs/themes/prism-okaidia.css'
// global style overrides for notion
import 'styles/notion.css'
// 레퍼런스 서비스 풍 시각 보정 — react-notion-x 표준 클래스에 레퍼런스 서비스 톤 입힘
import 'styles/folio-overrides.css'
// global style overrides for prism theme (optional)
import 'styles/prism-theme.css'

import type { AppProps } from 'next/app'
import * as Fathom from 'fathom-client'
import { useRouter } from 'next/router'
import { ThemeProvider } from 'next-themes'
import { posthog } from 'posthog-js'
import * as React from 'react'

import { CustomThemeStyles } from '@/components/CustomThemeStyles'
import { bootstrap } from '@/lib/bootstrap-client'
import {
  colorThemeMode,
  fathomConfig,
  fathomId,
  isServer,
  posthogConfig,
  posthogId
} from '@/lib/config'

if (!isServer) {
  bootstrap()
}

const forcedTheme =
  colorThemeMode === 'light' || colorThemeMode === 'custom'
    ? 'light'
    : colorThemeMode === 'dark'
      ? 'dark'
      : undefined

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()

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
      <CustomThemeStyles />

      <Component {...pageProps} />
    </ThemeProvider>
  )
}
