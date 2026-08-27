import * as React from 'react'

import { type ResolvedSiteConfig } from './site-config-resolve'

/**
 * 브라우저 쪽에서 설정을 나르는 통로.
 *
 * 설정이 모듈 상수였을 때는 컴포넌트가 `@/lib/config`를 직접 import해서
 * 사이트 이름과 도메인이 JS 번들에 박혔다. 지금은 `getStaticProps`가 실어 보낸
 * `pageProps.config`를 `_app.tsx`가 이 Provider에 넣고, 컴포넌트는
 * `useSiteConfig()`로 받는다. 값이 props를 타고 오므로 한 번들로 사이트 여러 개를
 * 그릴 수 있다.
 *
 * @see docs/architecture.md
 */
const SiteConfigContext = React.createContext<ResolvedSiteConfig | null>(null)

export function SiteConfigProvider({
  config,
  children
}: {
  config: ResolvedSiteConfig | null | undefined
  children: React.ReactNode
}) {
  return (
    <SiteConfigContext.Provider value={config ?? null}>
      {children}
    </SiteConfigContext.Provider>
  )
}

/**
 * 설정이 반드시 있는 자리에서 쓴다. 없으면 조용히 기본값으로 그리지 않고 던진다.
 * 값이 안 실려 온 것을 화면에서 눈치채기 어려워서, 붙는 즉시 알려주는 편이 낫다.
 */
export function useSiteConfig(): ResolvedSiteConfig {
  const config = React.useContext(SiteConfigContext)

  if (!config) {
    throw new Error(
      'useSiteConfig: SiteConfigProvider가 없거나 pageProps.config가 비었습니다'
    )
  }

  return config
}

/**
 * 설정 없이도 렌더돼야 하는 자리용. `/_error`처럼 페이지 데이터를 못 만든 경로가
 * 여기 해당한다.
 */
export function useOptionalSiteConfig(): ResolvedSiteConfig | null {
  return React.useContext(SiteConfigContext)
}
