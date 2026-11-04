---
'@folionote/core': minor
---

다른 서비스에서 주소를 지킨 채 옮겨 오기 위한 설정 세 가지.

- `prebuildPaths`: 빌드 때 미리 만들 pretty URL을 고른다. 생략하면 지금처럼 `pageUrlOverrides` 전부
- `noindex` (`SITE_NOINDEX` 환경변수): 사이트 전체를 검색엔진에서 숨긴다
- `comments.utterances`: 글 하단 utterances 댓글
- RSS `feed_url`이 슬래시 없는 `/feed`를 가리킨다
