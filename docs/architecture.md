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
loadSiteConfig()            lib/load-site-config.ts   (서버 전용, 프로세스당 1회)
        │
        ▼
resolveSiteConfig()         lib/site-config-resolve.ts (순수 함수)
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
             useSiteConfig()           components/**
```

## 각 층이 하는 일

### resolveSiteConfig (`lib/site-config-resolve.ts`)

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

### loadSiteConfig (`lib/load-site-config.ts`)

`site.config.ts`를 import하는 파일은 이것 하나뿐이다. 파일과 `process.env`를 읽어
`resolveSiteConfig`에 넘기고, 결과를 프로세스당 한 번만 계산해 캐시한다.

서버 전용이다. 브라우저 번들에 들어가면 사이트 이름과 도메인이 JS에 박혀서 한
번들로 사이트 여러 개를 그릴 수 없다. 실제로 예전에는 박혀 있었고, 지금은
`.next/static`에서 도메인 문자열이 하나도 나오지 않는다.

### PageProps.config

`getStaticProps`, `getServerSideProps`, API 라우트가 각각 `loadSiteConfig()`를
부른다. 페이지는 그 값을 `props.config`로 내려보낸다. 호스팅 서비스는 이 자리만
"요청의 호스트명으로 사이트를 찾아 설정을 만든다"로 바꾸면 된다.

### SiteConfigProvider / useSiteConfig (`lib/site-config-context.tsx`)

`pages/_app.tsx`가 `pageProps.config`를 Provider에 넣고, 컴포넌트는
`useSiteConfig()`로 받는다. 설정이 없으면 던진다. 값이 안 실려 온 것을 화면에서
눈치채기 어려워서, 붙는 즉시 알려주는 편이 낫다.

`/_error`처럼 페이지 데이터를 만들지 못한 경로용으로 `useOptionalSiteConfig()`가
따로 있다. `FontStyles`, `CustomThemeStyles`, `PageHead` 셋이 이걸 쓴다.

### 서버 라이브러리

`lib/` 아래 서버 코드는 설정을 첫 인자로 받는다.

| 함수                                     | 파일                        |
| ---------------------------------------- | --------------------------- |
| `resolveNotionPage(config, rawPageId?)`  | `lib/resolve-notion-page.ts`|
| `getPage(config, pageId)`                | `lib/notion.ts`             |
| `getSiteMap(config)`                     | `lib/get-site-map.ts`       |
| `getPreviewImageMap(config, recordMap)`  | `lib/preview-images.ts`     |
| `getCanonicalPageId(config, ...)`        | `lib/get-canonical-page-id.ts` |
| `mapPageUrl(config, recordMap, params)`  | `lib/map-page-url.ts`       |
| `createMapImageUrl(config)`              | `lib/map-image-url.ts`      |
| `getSocialImageUrl(config, pageId)`      | `lib/get-social-image-url.ts` |
| `getPageMetaOverride(config, pageId)`    | `lib/page-meta.ts`          |
| `getDb(config)`                          | `lib/db.ts`                 |

`pMemoize`로 캐시하는 함수는 캐시 키에 `config.rootNotionPageId`를 섞는다. 인자
없는 memoize를 그대로 두면 먼저 그린 사이트의 내비게이션이나 프리뷰 이미지가 뒤에
오는 사이트에 붙는다.

## 사이트 설정이 아닌 것

프로세스 하나에 하나뿐인 값은 설정 객체에 담지 않는다.

- `lib/server-env.ts`: Redis 접속 정보. 켤지 말지는 사이트 설정(`isRedisEnabled`)이
  정하고, 어디에 붙을지는 환경변수가 정한다. 접속 정보를 설정 객체에 담으면
  `__NEXT_DATA__`를 타고 브라우저까지 나간다.
- `lib/analytics-env.ts`: Fathom, PostHog. `NEXT_PUBLIC_` 접두사가 붙어 있어 Next가
  브라우저 번들로 인라인한다. 배포 하나에 하나뿐인 값이라 그래도 된다.

## 패키지로 가를 때

`components/`와 `lib/`은 `pages/`도 `../site.config`도 import하지 않는다. 예외는
`lib/load-site-config.ts` 하나다. 이 경계 덕분에 나중에 이렇게 가르는 것이 기계적인
작업이 된다.

```
packages/core     components/  lib/  styles/
apps/self-host    pages/  site.config.ts  public/  lib/load-site-config.ts
```

새 코드를 넣을 때 이 규칙을 깨지 않는지 본다. `components/` 안에서
`process.env.SITE_*`를 읽거나 `@/lib/load-site-config`를 import하면 그 순간 다시
사이트 하나에 묶인다.

## 어드민

`/admin`은 `site.config.ts`를 화면으로 고친다. 저장하면 `lib/serialize-site-config.ts`가
파일을 통째로 다시 쓰고, dev 서버가 변경을 감지해 다시 컴파일한다. 오른쪽
미리보기는 같은 오리진의 `<iframe src="/">`이라 저장 뒤 새로고침하면 반영된다.

어드민이 다루는 것은 `SiteConfig`(원본)이지 `ResolvedSiteConfig`(파생 결과)가
아니다. 파생값을 저장하면 사용자가 적지 않은 기본값까지 파일에 박혀서, 나중에
기본값을 바꿔도 그 사이트는 따라오지 않는다.
