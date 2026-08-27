# @folionote/core

Notion 페이지 하나를 사이트로 그리는 렌더러. [folionote](https://github.com/nobel6018/folionote)의
Next.js 앱에서 렌더링 부분만 떼어낸 패키지다.

이 패키지는 사이트 하나에 묶여 있지 않다. 설정을 모듈 상수가 아니라 **요청마다 넘겨받는
값**으로 다루기 때문에, 프로세스 하나가 서로 다른 사이트 수백 개를 그릴 수 있다.

- 데이터: `notion-client` (비공식 Notion API)
- 렌더링: `react-notion-x`
- 프레임워크: Next.js Pages Router

## 설치

```bash
pnpm add @folionote/core next react react-dom
```

`next`, `react`, `react-dom`은 peer dependency다. 프리뷰 이미지(LQIP 블러)를 쓴다면
`sharp`도 앱의 dependencies에 넣는다. 네이티브 모듈이라 앱 루트에서 풀려야 번들러가
외부 모듈로 두고 런타임에 찾는다.

`next.config.js`에 `transpilePackages`를 넣어야 한다. 이 패키지는 번들하지 않은 tsc
출력물이라 JSX와 CSS 모듈이 그대로 들어 있고, Next가 직접 컴파일해야 한다.

```js
export default {
  transpilePackages: ['@folionote/core', 'react-tweet']
}
```

## 진입점

| 경로                        | 어디서 쓰나 | 무엇이 들어 있나                                                          |
| --------------------------- | ----------- | ------------------------------------------------------------------------- |
| `@folionote/core`           | 클라이언트  | 컴포넌트, `SiteConfigProvider`, `useSiteConfig`, 순수 헬퍼                 |
| `@folionote/core/config`    | 어디서나    | `resolveSiteConfig`, `siteConfig`, `serializeSiteConfig`, 타입             |
| `@folionote/core/server`    | Node        | `resolveNotionPage`, `getPage`, `getSiteMap`, `search`, 피드/사이트맵 생성 |
| `@folionote/core/edge`      | edge        | 순수 헬퍼 + Notion 클라이언트. `sharp`와 Redis에 닿지 않는다              |
| `@folionote/core/admin`     | 클라이언트  | 설정 폼 UI (`AdminFields`, `CodeView`)                                    |
| `@folionote/core/styles.css` | `_app`     | 이 패키지가 그리는 화면에 필요한 CSS 전부                                 |

`server`는 배럴이라 한 줄만 가져와도 프리뷰 이미지(`sharp`)와 Redis 클라이언트가
따라온다. edge 런타임에서 도는 코드는 `edge`를 쓴다.

## 최소 예제

`pages/_app.tsx`

```tsx
import '@folionote/core/styles.css'

import { SiteConfigProvider } from '@folionote/core'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SiteConfigProvider config={pageProps.config}>
      <Component {...pageProps} />
    </SiteConfigProvider>
  )
}
```

`pages/index.tsx`

```tsx
import { NotionPage } from '@folionote/core'
import { resolveSiteConfig, type PageProps } from '@folionote/core/config'
import { resolveNotionPage } from '@folionote/core/server'

export async function getStaticProps() {
  const config = resolveSiteConfig({
    rootNotionPageId: '3bcc0343b4fa81abafd4f7fb22799e14',
    name: 'my site',
    domain: 'example.com'
  })

  return { props: await resolveNotionPage(config), revalidate: 600 }
}

export default function IndexPage(props: PageProps) {
  return <NotionPage {...props} />
}
```

`resolveSiteConfig`는 순수 함수다. 파일도 `process.env`도 읽지 않고, 넘긴 값에
기본값을 채워 직렬화 가능한 객체를 돌려준다. 그 객체를 `getStaticProps`가
`props.config`로 실어 보내고, 브라우저에서는 `useSiteConfig()`가 받는다.

## 앱이 만들어야 하는 라우트

컴포넌트가 같은 오리진의 이 경로들을 부른다. 없으면 해당 기능만 조용히 빠진다.

| 경로                 | 쓰는 곳                       |
| -------------------- | ----------------------------- |
| `/api/search-notion` | 검색 다이얼로그 (`searchNotion`) |
| `/api/pageview`      | 페이지뷰 카운트               |
| `/api/social-image`  | OG 이미지 (`getSocialImageUrl`) |

## 캐시와 Notion 클라이언트 주입

`deps` 인자로 저장소와 Notion 클라이언트를 갈아끼운다. 아무것도 넘기지 않으면
Keyv(설정에서 켜면 Redis)와 이 패키지가 만든 클라이언트를 쓴다.

```ts
import { resolveNotionPage, type CoreDeps } from '@folionote/core/server'

const deps: CoreDeps = {
  store: {
    async get(key) {
      return myCache.get(`${siteId}:${key}`)
    },
    async set(key, value, ttl) {
      return myCache.set(`${siteId}:${key}`, value, ttl)
    }
  },
  notion: myNotionClient
}

const props = await resolveNotionPage(config, path, deps)
```

`deps`를 받는 함수: `resolveNotionPage`, `getPage`, `getSiteMap`, `search`,
`getPreviewImageMap`, `getTweetsMap`, `getDb`, `getNotion`, `oembed`.

한 가지 주의. 사이트맵 크롤(`getSiteMap`)과 트윗 조회는 `p-memoize`로 캐시하는데,
캐시 키에 `deps`는 넣지 않는다. 함수와 클라이언트 인스턴스는 직렬화되지 않고, 같은
사이트를 서로 다른 캐시로 두 번 크롤할 이유도 없기 때문이다. 사이트 단위 격리는
키에 들어가는 `config.rootNotionPageId`가 맡는다.

## CSS 순서

`@folionote/core/styles.css` 안에서 이 순서로 합쳐진다. 뒤가 앞을 덮는다.

1. `katex`, `prismjs` 기본 테마, `react-notion-x` 기본값
2. `fonts.css` (`@font-face`)
3. `folio-tokens.css` (디자인 토큰. react-notion-x 변수를 덮는다)
4. `global.css`, `notion.css`, `folio-overrides.css`, `prism-theme.css`

자기 CSS로 덮으려면 이 줄보다 **뒤에** 임포트한다. `_app.tsx`에서 위쪽에 두면
Next가 뒤에 붙이는 청크에 밀려서 같은 특이도일 때 진다.

## 왜 번들하지 않는가

tsc 출력을 그대로 발행한다. tsup이나 rollup으로 말면 스택 트레이스가 번들 파일을
가리켜서 디버깅이 어려워지고, CSS 모듈을 따로 처리해야 한다. Next가 어차피
`transpilePackages`로 다시 컴파일하므로 번들할 이유가 없다.

같은 이유로 `"type": "module"`을 붙이지 않았다. 붙이면 webpack이 dist를 엄격한
ESM으로 보고 CJS 기본 내보내기 interop을 하지 않는다. 실제로 `next/image`가
컴포넌트가 아니라 `{ default, getImageProps }` 객체로 들어와서 화면이
"Element type is invalid"로 죽었다. 이 패키지는 번들러를 거쳐 쓰는 것을 전제한다.

## 버전 정책

semver를 따른다. 진입점에서 내보내는 이름과 시그니처가 공개 API다.

- patch: 동작 수정, 내부 정리
- minor: 새 컴포넌트나 옵션 추가, 하위 호환 유지
- major: 진입점 구성 변경, 내보내던 이름 제거, `ResolvedSiteConfig` 필드 삭제

`peerDependencies`(next, react)의 major는 이 패키지의 major로 올린다.

## 라이선스

MIT
