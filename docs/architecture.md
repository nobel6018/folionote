# 설정이 흐르는 길

이 리포는 Notion 페이지 하나를 사이트로 발행한다. 그런데 렌더링 코드 자체는
사이트 하나에 묶여 있으면 안 된다. 나중에 호스팅 서비스가 이 코드를 패키지로
가져다 쓸 때, 프로세스 하나가 사이트 수백 개를 그려야 하기 때문이다.

그래서 설정은 모듈 상수가 아니라 **요청마다 넘겨받는 값**이다. 이 문서는 그 값이
어디서 만들어져 어디까지 가는지를 적는다.

## 한눈에

```
site.config.ts + process.env
        │
        ▼
loadSiteConfig()            lib/load-site-config.ts   (앱, 서버 전용, 프로세스당 1회)
        │
        ▼
resolveSiteConfig()         @folionote/core/config    (순수 함수)
        │
        ▼
ResolvedSiteConfig          직렬화 가능한 평범한 객체
        │
        ├──► 서버 라이브러리에 인자로   getPage(config, id), getSiteMap(config), ...
        │
        └──► PageProps.config          getStaticProps / getServerSideProps
                    │
                    ▼
             SiteConfigProvider        pages/_app.tsx
                    │
                    ▼
             useSiteConfig()           @folionote/core 컴포넌트
```

## 각 층이 하는 일

### resolveSiteConfig (`packages/core/src/config/site-config-resolve.ts`)

원본 설정과 환경변수를 받아 최종 값을 만든다. 순수 함수라 `process.env`도
`site.config.ts`도 읽지 않는다. 같은 입력이면 항상 같은 결과가 나온다.

여기서 하는 일은 세 가지다. 파일과 환경변수 중 무엇을 쓸지 고르고
(`rootNotionPageId`는 `NOTION_ROOT_PAGE_ID`, `name`은 `SITE_NAME`을 본다),
생략된 값에 기본값을 채우고, 로고나 폰트처럼 여러 모양으로 적을 수 있는 값을
하나의 형태로 정규화한다.

결과는 JSON으로 직렬화되는 객체여야 한다. `getStaticProps`가 이 값을 그대로
브라우저까지 실어 보내기 때문이다. 함수를 담을 수 없어서 예전
`getMastodonHandle()`은 `mastodonHandle` 필드로 바뀌었다. `undefined` 값을 가진
키는 반환 직전에 지운다. Next가 `undefined`를 직렬화하지 못하고 빌드를 세운다.

필수값이 비면 여기서 던진다. 메시지에 파일 경로와 환경변수 이름을 둘 다 적어 둔다.

### loadSiteConfig (`lib/load-site-config.ts`, 앱)

`site.config.ts`를 import하는 파일은 이것 하나뿐이다. 파일과 `process.env`를 읽어
`resolveSiteConfig`에 넘기고, 결과를 프로세스당 한 번만 계산해 캐시한다.

서버 전용이다. 브라우저 번들에 들어가면 사이트 이름과 도메인이 JS에 박혀서 한
번들로 사이트 여러 개를 그릴 수 없다. 실제로 예전에는 박혀 있었고, 지금은
`.next/static`에서 도메인 문자열이 하나도 나오지 않는다.

### PageProps.config

`getStaticProps`, `getServerSideProps`, API 라우트가 각각 `loadSiteConfig()`를
부른다. 페이지는 그 값을 `props.config`로 내려보낸다. 호스팅 서비스는 이 자리만
"요청의 호스트명으로 사이트를 찾아 설정을 만든다"로 바꾸면 된다.

### SiteConfigProvider / useSiteConfig (`packages/core/src/react/site-config-context.tsx`)

`pages/_app.tsx`가 `pageProps.config`를 Provider에 넣고, 컴포넌트는
`useSiteConfig()`로 받는다. 설정이 없으면 던진다. 값이 안 실려 온 것을 화면에서
눈치채기 어려워서, 붙는 즉시 알려주는 편이 낫다.

`/_error`처럼 페이지 데이터를 만들지 못한 경로용으로 `useOptionalSiteConfig()`가
따로 있다. `FontStyles`, `CustomThemeStyles`, `PageHead` 셋이 이걸 쓴다.

### 서버 라이브러리

`@folionote/core/server`의 함수는 설정을 첫 인자로 받는다. 경로는 모두
`packages/core/src/` 아래다.

| 함수                                          | 파일                            |
| --------------------------------------------- | ------------------------------- |
| `resolveNotionPage(config, rawPageId?, deps?)` | `server/resolve-notion-page.ts` |
| `getPage(config, pageId, deps?)`               | `server/notion.ts`              |
| `getSiteMap(config, deps?)`                    | `server/get-site-map.ts`        |
| `getPreviewImageMap(config, recordMap, deps?)` | `server/preview-images.ts`      |
| `buildFeedXml(config, siteMap)`                | `server/build-feed.ts`          |
| `buildSitemapXml(config, siteMap)`             | `server/build-sitemap.ts`       |
| `getCanonicalPageId(config, ...)`              | `shared/get-canonical-page-id.ts` |
| `mapPageUrl(config, recordMap, params)`        | `shared/map-page-url.ts`        |
| `createMapImageUrl(config)`                    | `shared/map-image-url.ts`       |
| `getSocialImageUrl(config, pageId)`            | `shared/get-social-image-url.ts` |
| `getPageMetaOverride(config, pageId)`          | `shared/page-meta.ts`           |
| `getDb(config, deps?)`                         | `server/db.ts`                  |

마지막 `deps` 인자는 호스팅 서비스가 캐시 저장소와 Notion 클라이언트를 갈아끼우는
자리다. 자체 호스팅 앱은 넘기지 않는다 (@see packages/core/README.md).

`pMemoize`로 캐시하는 함수는 캐시 키에 `config.rootNotionPageId`를 섞는다. 인자
없는 memoize를 그대로 두면 먼저 그린 사이트의 내비게이션이나 프리뷰 이미지가 뒤에
오는 사이트에 붙는다.

## 사이트 설정이 아닌 것

프로세스 하나에 하나뿐인 값은 설정 객체에 담지 않는다.

- `packages/core/src/server/server-env.ts`: Redis 접속 정보. 켤지 말지는 사이트 설정(`isRedisEnabled`)이
  정하고, 어디에 붙을지는 환경변수가 정한다. 접속 정보를 설정 객체에 담으면
  `__NEXT_DATA__`를 타고 브라우저까지 나간다.
- `lib/analytics-env.ts`: Fathom, PostHog. `NEXT_PUBLIC_` 접두사가 붙어 있어 Next가
  브라우저 번들로 인라인한다. 배포 하나에 하나뿐인 값이라 그래도 된다.

## 패키지 경계

이미 갈랐다. 리포는 pnpm workspace이고, 앱은 루트에 그대로 있다.

```
/                 pages/  site.config.ts  public/  next.config.js
                  lib/load-site-config.ts  lib/admin/  lib/analytics-env.ts
packages/core     @folionote/core
```

앱이 루트에 남은 이유는 배포다. README의 Vercel Deploy 버튼과 `vercel --prod`,
그리고 이미 fork한 리포들이 root directory 설정 없이 그대로 동작해야 한다.

`packages/core`는 `pages/`도 `../site.config`도 import하지 않는다. 앱은
`@folionote/core`, `/config`, `/server`, `/edge`, `/admin` 다섯 진입점으로만
패키지에 닿는다. `packages/core` 안으로 상대 경로를 뚫지 않는다.

새 코드를 넣을 때 이 규칙을 깨지 않는지 본다. `packages/core` 안에서
`process.env.SITE_*`를 읽거나 앱 파일을 import하면 그 순간 다시 사이트 하나에 묶인다.

### 진입점

| 경로                         | 소스                | 무엇이 들어 있나                              |
| ---------------------------- | ------------------- | --------------------------------------------- |
| `@folionote/core`            | `src/react/`        | 컴포넌트, Provider, 훅, 순수 헬퍼             |
| `@folionote/core/config`     | `src/config/`       | 설정 해석기, 직렬화기, 타입                   |
| `@folionote/core/server`     | `src/server/`       | Notion 읽기, 캐시, 피드/사이트맵 생성         |
| `@folionote/core/edge`       | `src/edge/`         | edge 런타임에서 도는 것만                     |
| `@folionote/core/admin`      | `src/admin/`        | 설정 폼 UI                                    |
| `@folionote/core/styles.css` | `styles/`           | CSS 전부 (순서가 정해져 있다)                 |

`src/shared/`는 진입점이 아니다. 순수하지만 컴포넌트도 서버도 쓰는 코드라 위 진입점
여럿에서 다시 내보낸다.

`edge`가 따로 있는 이유는 배럴 때문이다. `server`는 한 줄만 가져와도 프리뷰
이미지(`sharp`)와 Redis 클라이언트를 끌고 온다. edge 번들은 `node:` 내장 모듈을
못 읽어서 그 자리에서 빌드가 깨진다. `pages/api/social-image.tsx`가 실제로 그렇게
깨졌고, 그래서 `edge` 진입점을 뒀다.

### 왜 번들하지 않는가

`packages/core`는 tsc 출력을 그대로 발행한다. 번들하면 스택 트레이스가 번들 파일을
가리키고 CSS 모듈을 따로 처리해야 하는데, Next가 `transpilePackages`로 어차피 다시
컴파일하므로 얻는 것이 없다.

같은 이유로 `"type": "module"`을 붙이지 않았다. 붙이면 webpack이 dist를 엄격한
ESM으로 보고 CJS 기본 내보내기 interop을 건너뛴다. 실측으로 `next/image`가
컴포넌트가 아니라 `{ default, getImageProps }` 객체로 들어와서 첫 화면이
"Element type is invalid"로 죽었다. 앱 소스였을 때는 Next의 SWC가 interop 헬퍼를
넣어 줘서 보이지 않던 문제다.

## 어드민

`/admin`은 `site.config.ts`를 화면으로 고친다. 저장하면 `serializeSiteConfig()`가
파일을 통째로 다시 쓰고, dev 서버가 변경을 감지해 다시 컴파일한다. 오른쪽
미리보기는 같은 오리진의 `<iframe src="/">`이라 저장 뒤 새로고침하면 반영된다.

어드민이 다루는 것은 `SiteConfig`(원본)이지 `ResolvedSiteConfig`(파생 결과)가
아니다. 파생값을 저장하면 사용자가 적지 않은 기본값까지 파일에 박혀서, 나중에
기본값을 바꿔도 그 사이트는 따라오지 않는다.
