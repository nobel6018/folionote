# @folionote/core

## 0.2.0

### Minor Changes

- adc0bea: 다른 서비스에서 주소를 지킨 채 옮겨 오기 위한 설정 세 가지.
  - `prebuildPaths`: 빌드 때 미리 만들 pretty URL을 고른다. 생략하면 지금처럼 `pageUrlOverrides` 전부
  - `noindex` (`SITE_NOINDEX` 환경변수): 사이트 전체를 검색엔진에서 숨긴다
  - `comments.utterances`: 글 하단 utterances 댓글
  - RSS `feed_url`이 슬래시 없는 `/feed`를 가리킨다

- 9ec9cbf: 렌더러를 `@folionote/core`로 분리한 첫 릴리스.
  - 진입점 다섯 개: `.`(컴포넌트), `./config`(순수 설정), `./server`(Notion 읽기),
    `./edge`(edge 런타임 안전), `./admin`(설정 폼 UI)
  - `@folionote/core/styles.css` 한 줄로 필요한 CSS 전부를 가져온다
  - `resolveNotionPage`, `getPage`, `getSiteMap`, `getPreviewImageMap`이 `deps`로
    캐시 저장소와 Notion 클라이언트 주입을 받는다

### Patch Changes

- b921521: 컬렉션 아이콘이 있는 전체 페이지 DB에서 나던 hydration 오류(#418)와 Notion 커스텀 이모지 아이콘이 깨진 이미지로 나오던 문제를 고친다.
