---
'@folionote/core': minor
---

렌더러를 `@folionote/core`로 분리한 첫 릴리스.

- 진입점 다섯 개: `.`(컴포넌트), `./config`(순수 설정), `./server`(Notion 읽기),
  `./edge`(edge 런타임 안전), `./admin`(설정 폼 UI)
- `@folionote/core/styles.css` 한 줄로 필요한 CSS 전부를 가져온다
- `resolveNotionPage`, `getPage`, `getSiteMap`, `getPreviewImageMap`이 `deps`로
  캐시 저장소와 Notion 클라이언트 주입을 받는다
