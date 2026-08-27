import Head from 'next/head'
import * as React from 'react'

import { useOptionalSiteConfig } from '../site-config-context.js'

/**
 * 선택한 폰트의 스타일시트를 받고 `--folio-font-sans`를 덮는다
 * (레퍼런스 서비스 어드민의 스타일 > 폰트).
 *
 * 폰트를 `styles/fonts.css`에 @import로 박아 두면 어떤 폰트를 고르든 항상
 * 내려받게 된다. 설정에서 고른 것만 받도록 여기서 link로 넣는다.
 *
 * `:root:root`인 이유는 CustomThemeStyles와 같다. next/head의 style이 CSS 번들
 * link보다 앞에 렌더돼서 같은 `:root`로는 folio-tokens.css에 순서로 밀린다.
 */
export function FontStyles() {
  const config = useOptionalSiteConfig()

  if (!config) {
    return null
  }

  const { font } = config
  const css = [
    `--folio-font-sans: ${font.sans};`,
    font.mono ? `--folio-font-mono: ${font.mono};` : null
  ]
    .filter(Boolean)
    .join('\n  ')

  return (
    <Head>
      {font.urls.length > 0 && (
        <>
          <link
            key='folio-font-preconnect-gstatic'
            rel='preconnect'
            href='https://fonts.gstatic.com'
            crossOrigin='anonymous'
          />
          {font.urls.map((url) => (
            <link key={url} rel='stylesheet' href={url} />
          ))}
        </>
      )}

      <style
        key='folio-font-vars'
        dangerouslySetInnerHTML={{ __html: `:root:root {\n  ${css}\n}` }}
      />
    </Head>
  )
}
