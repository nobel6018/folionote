import Head from 'next/head'
import * as React from 'react'

import { useOptionalSiteConfig } from '../site-config-context.js'

/**
 * `colorTheme.mode: 'custom'`일 때 배경/글자색을 CSS 변수로 주입한다.
 * (레퍼런스 서비스 어드민의 색상 테마 > 커스텀)
 *
 * 흐린 글자색과 테두리는 지정한 글자색에서 `color-mix`로 파생시킨다. 사용자에게
 * 색을 여섯 개 받는 대신 두 개만 받고, 레퍼런스 서비스 어드민과 같은 입력 개수를 유지한다.
 *
 * react-notion-x가 자체적으로 쓰는 `--bg-color` / `--fg-color` 계열까지 같이
 * 덮어야 코드블록, 검색창 같은 내부 컴포넌트가 따라온다.
 *
 * 셀렉터가 `:root:root`인 이유: next/head가 넣는 style은 CSS 번들 link보다
 * **앞에** 렌더돼서, 같은 `:root`로는 folio-tokens.css에 순서로 밀린다.
 * 특이도를 한 단계 올려 순서와 무관하게 이기게 한다.
 */
export function CustomThemeStyles() {
  const config = useOptionalSiteConfig()

  if (!config?.customThemeColors) {
    return null
  }

  const { background, foreground } = config.customThemeColors

  const css = `:root:root {
  --folio-bg: ${background};
  --folio-header-bg: ${background};
  --folio-surface: ${background};
  --folio-surface-muted: color-mix(in srgb, ${foreground} 6%, ${background});
  --folio-callout-bg: color-mix(in srgb, ${foreground} 8%, ${background});
  --folio-text: ${foreground};
  --folio-text-muted: color-mix(in srgb, ${foreground} 65%, transparent);
  --folio-text-subtle: color-mix(in srgb, ${foreground} 45%, transparent);
  --folio-border: color-mix(in srgb, ${foreground} 16%, transparent);
  --folio-divider: color-mix(in srgb, ${foreground} 9%, transparent);

  --bg-color: ${background};
  --bg-color-1: color-mix(in srgb, ${foreground} 6%, ${background});
  --fg-color: ${foreground};
  --fg-color-0: color-mix(in srgb, ${foreground} 9%, transparent);
  --fg-color-1: color-mix(in srgb, ${foreground} 16%, transparent);
  --fg-color-2: color-mix(in srgb, ${foreground} 40%, transparent);
  --fg-color-3: color-mix(in srgb, ${foreground} 60%, transparent);
  --fg-color-6: color-mix(in srgb, ${foreground} 80%, transparent);
}`

  return (
    <Head>
      <style
        key='folio-custom-theme'
        dangerouslySetInnerHTML={{ __html: css }}
      />
    </Head>
  )
}
