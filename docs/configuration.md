# Configuration

`site.config.ts`의 모든 옵션 설명.

## 필수 옵션

| 옵션               | 타입     | 설명                                                                    |
| ------------------ | -------- | ----------------------------------------------------------------------- |
| `rootNotionPageId` | `string` | 사이트 root Notion 페이지 ID (32자 hex). public으로 공개되어 있어야 함. |
| `name`             | `string` | 사이트 이름. 헤더 좌측 + OG title에 사용.                               |
| `domain`           | `string` | 운영 도메인 (예: `mysite.com`). canonical URL 생성에 사용.              |
| `author`           | `string` | 작성자 이름. RSS, OG, footer copyright에 사용.                          |

### 환경변수로도 받는다

네 값은 `site.config.ts`에서 빼고 환경변수로만 줄 수도 있습니다. 리포를 클론해 파일을 고치고 커밋하는 과정 없이, Vercel Deploy 버튼이 띄우는 입력 폼만으로 배포하려고 만든 경로입니다.

| 옵션               | 환경변수              |
| ------------------ | --------------------- |
| `rootNotionPageId` | `NOTION_ROOT_PAGE_ID` |
| `name`             | `SITE_NAME`           |
| `author`           | `SITE_AUTHOR`         |
| `domain`           | `SITE_DOMAIN`         |

값을 고르는 순서는 **`site.config.ts` > 환경변수 > 파생 기본값**입니다. 파일에 값이 있으면 환경변수는 무시합니다. 그래서 환경변수로 띄운 사이트에서 `/admin`으로 설정을 저장하면(그때 네 값이 파일에 박힙니다) 이후로는 파일이 기준이 되고, 환경변수를 지워도 사이트는 그대로 돕니다.

`NOTION_ROOT_PAGE_ID`는 32자 ID 대신 Notion 페이지 주소를 통째로 넣어도 됩니다. `https://www.notion.so/My-Page-3bcc0343b4fa81abafd4f7fb22799e14` 같은 주소에서 ID를 뽑아냅니다.

파생 기본값이 있는 값은 둘입니다.

- `author` - 없으면 `name`을 씁니다
- `domain` - 없으면 Vercel이 주입하는 호스트명(`VERCEL_PROJECT_PRODUCTION_URL`, 없으면 `VERCEL_URL`)을 쓰고, 그것도 없으면 `localhost:3000`입니다

그래서 Deploy 버튼이 반드시 물어야 하는 값은 `NOTION_ROOT_PAGE_ID`와 `SITE_NAME` 두 개입니다. `rootNotionPageId`와 `name`이 파일에도 환경변수에도 없으면 사이트는 어느 쪽에 넣어야 하는지 알려주는 에러로 실패합니다.

환경변수 이름에 `NEXT_PUBLIC_` 접두사가 없는데도 브라우저에서 읽히는 것은 `next.config.js`의 `env`에 적어 뒀기 때문입니다(사이트 이름과 도메인은 클라이언트 번들에도 들어갑니다). 빌드 시점에 값이 박히므로 환경변수를 바꾸면 재배포가 필요합니다.

## 선택 옵션

### 메타데이터

- `description` - 사이트 설명 (OG description)
- `language` - 기본 `'en'`. 한글 사이트면 `'ko'`
- `defaultPageIcon` - 페이지 아이콘 없을 때의 fallback URL
- `defaultPageCover` - 커버 이미지 없을 때의 fallback URL
- `defaultPageCoverPosition` - 커버 이미지 vertical position (0~1, 기본 0.5)

### 소셜 링크 (Footer 아이콘)

- `twitter`, `github`, `linkedin`, `youtube`, `mastodon`, `newsletter`, `zhihu`

### URL 라우팅

- `includeNotionIdInUrls` - `true` 면 URL 끝에 Notion ID 포함 (예: `/about-67890abc...`)
- `pageUrlOverrides` - pretty URL ↔ Notion page ID 매핑
  ```ts
  pageUrlOverrides: {
    '/about': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    '/posts/hello-world': 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'
  }
  ```
- `pageUrlAdditions` - 추가 매핑 (overrides가 우선)

### 헤더 / 네비게이션

- `navigationStyle: 'default' | 'custom'`
  - `'default'` - react-notion-x 기본 헤더 (페이지 아이콘 + 제목만)
  - `'custom'` - 레퍼런스 서비스 풍 헤더 (nav 링크 + 다크모드 토글 + 검색)
- `navigationLinks: Array<{ title, pageId?, url? }>` - `'custom'` 모드에서 노출할 링크
  ```ts
  navigationLinks: [
    { title: 'About', pageId: 'xxxx...' },
    { title: 'Posts', url: '/posts' }
  ]
  ```

### 기능 토글

- `isPreviewImageSupportEnabled` - LQIP 프리뷰 (기본 `true`)
- `isRedisEnabled` - preview image cache용 Redis (기본 `false`)
- `isSearchEnabled` - 사이트 내 검색 (기본 `true`)
- `isTweetEmbedSupportEnabled` - Twitter embed (기본 `true`)

### 외부 워크스페이스 제한 (보안)

- `rootNotionSpaceId` - 명시하면 _그 워크스페이스의 페이지만_ 렌더. 외부 페이지가 root에서 링크돼도 노출 안 함

## 환경변수 (`.env.local`)

`.env.example` 복사해서 작성. 모두 optional.

| Key                                                             | 용도                         |
| --------------------------------------------------------------- | ---------------------------- |
| `NEXT_PUBLIC_FATHOM_ID`                                         | Fathom analytics             |
| `NEXT_PUBLIC_POSTHOG_ID`                                        | PostHog analytics            |
| `TWITTER_ACCESS_TOKEN`                                          | 트윗 embed (rate limit 회피) |
| `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_USER`, `REDIS_NAMESPACE` | preview image cache          |
