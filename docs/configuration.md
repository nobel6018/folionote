# Configuration

`site.config.ts`의 모든 옵션 설명.

## 필수 옵션

| 옵션 | 타입 | 설명 |
|---|---|---|
| `rootNotionPageId` | `string` | 사이트 root Notion 페이지 ID (32자 hex). public으로 공개되어 있어야 함. |
| `name` | `string` | 사이트 이름. 헤더 좌측 + OG title에 사용. |
| `domain` | `string` | 운영 도메인 (예: `mysite.com`). canonical URL 생성에 사용. |
| `author` | `string` | 작성자 이름. RSS, OG, footer copyright에 사용. |

## 선택 옵션

### 메타데이터
- `description` — 사이트 설명 (OG description)
- `language` — 기본 `'en'`. 한글 사이트면 `'ko'`
- `defaultPageIcon` — 페이지 아이콘 없을 때의 fallback URL
- `defaultPageCover` — 커버 이미지 없을 때의 fallback URL
- `defaultPageCoverPosition` — 커버 이미지 vertical position (0~1, 기본 0.5)

### 소셜 링크 (Footer 아이콘)
- `twitter`, `github`, `linkedin`, `youtube`, `mastodon`, `newsletter`, `zhihu`

### URL 라우팅
- `includeNotionIdInUrls` — `true` 면 URL 끝에 Notion ID 포함 (예: `/about-67890abc...`)
- `pageUrlOverrides` — pretty URL ↔ Notion page ID 매핑
  ```ts
  pageUrlOverrides: {
    '/about': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    '/posts/hello-world': 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy'
  }
  ```
- `pageUrlAdditions` — 추가 매핑 (overrides가 우선)

### 헤더 / 네비게이션
- `navigationStyle: 'default' | 'custom'`
  - `'default'` — react-notion-x 기본 헤더 (페이지 아이콘 + 제목만)
  - `'custom'` — 레퍼런스 서비스 풍 헤더 (nav 링크 + 다크모드 토글 + 검색)
- `navigationLinks: Array<{ title, pageId?, url? }>` — `'custom'` 모드에서 노출할 링크
  ```ts
  navigationLinks: [
    { title: 'About', pageId: 'xxxx...' },
    { title: 'Posts', url: '/posts' }
  ]
  ```

### 기능 토글
- `isPreviewImageSupportEnabled` — LQIP 프리뷰 (기본 `true`)
- `isRedisEnabled` — preview image cache용 Redis (기본 `false`)
- `isSearchEnabled` — 사이트 내 검색 (기본 `true`)
- `isTweetEmbedSupportEnabled` — Twitter embed (기본 `true`)

### 외부 워크스페이스 제한 (보안)
- `rootNotionSpaceId` — 명시하면 *그 워크스페이스의 페이지만* 렌더. 외부 페이지가 root에서 링크돼도 노출 안 함

## 환경변수 (`.env.local`)

`.env.example` 복사해서 작성. 모두 optional.

| Key | 용도 |
|---|---|
| `NEXT_PUBLIC_FATHOM_ID` | Fathom analytics |
| `NEXT_PUBLIC_POSTHOG_ID` | PostHog analytics |
| `TWITTER_ACCESS_TOKEN` | 트윗 embed (rate limit 회피) |
| `REDIS_HOST`, `REDIS_PASSWORD`, `REDIS_USER`, `REDIS_NAMESPACE` | preview image cache |
