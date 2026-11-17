# @folionote/core

## 0.3.0

### Minor Changes

- 42d4fc1: `revalidateSeconds` 설정을 추가한다. 페이지 ISR 재생성 주기(초)이고 생략하면 지금처럼 600이다. Notion 수정을 즉시 갱신으로 반영하는 사이트는 길게 잡아 재생성 횟수와 서버리스 실행 시간을 줄일 수 있다.
- cd53947: `strictPaths` 설정을 추가한다. 켜면 pageUrlOverrides에 없는 주소를 크롤 없이 바로 404로 돌리고, 목록에 없는 페이지는 Notion ID 주소로 링크하며, 사이트맵을 크롤 없이 만든다.

### Patch Changes

- 90b392c: 갤러리 카드 커버(unsplash)를 카드 비율(16:9)로 서버에서 잘라 받는다. 폭만 줄이면 카드에서 잘려 나갈 부분까지 받아서, 세로 사진 한 장이 452KB였다(잘라 받으면 158KB). Notion에서 지정한 커버 위치를 초점으로 넘겨 화면에 보이는 부분은 같다.
- 64c81cf: Notion에서 전체 너비를 켠 페이지의 본문이 708px에 묶여 왼쪽에 붙던 문제와, 스크롤바가 자리를 차지하는 환경에서 커버 때문에 페이지가 가로로 밀리던 문제를 고친다.
- 01eabf3: 갤러리 카드 커버와 상세 페이지 커버가 화면 폭과 상관없이 `w=3840` 원본 크기로 내려오던 문제를 고친다. next/image에 그려지는 폭(`sizes`)을 주어 카드는 카드 폭, 본문 이미지는 본문 폭, 상세 커버는 화면 폭에 맞는 크기를 받는다.
- 07c8cbe: 미리보기 이미지(LQIP)를 동시에 3장씩 만든다(전에는 8장). 컬렉션 페이지는 이미지가 170장을 넘어 메모리가 1GB를 넘었고, 1GB 서버리스 함수에서 재생성이 메모리 부족으로 실패했다.
- 07c8cbe: 미리보기 이미지(LQIP)를 만들 때 sharp 캐시를 끈다. 이미지마다 한 번만 디코딩하므로 캐시는 메모리만 차지했다. 이미지 174장인 페이지 재생성에서 최대 메모리가 1058MB에서 767MB로 줄었다.
- 4ac6af5: 모바일에서 이모지 페이지 아이콘이 화면 왼쪽 밖으로 잘리던 문제를 고치고, 본문 여백과 모바일 크기(480px 경계), 커버 높이, 인용 글자 크기, 본문 폰트, 전체 페이지 데이터베이스 배치를 레퍼런스 서비스 실측에 맞춘다.
- 5bb6d6e: 상세 페이지 커버를 지연 로딩 없이 먼저 받는다. react-notion-x는 프리뷰 이미지가 없는 커버를 `loading="lazy"`로 그려 첫 화면의 가장 큰 요소(LCP)가 늦게 떴다. 커버를 직접 그려 `fetchpriority="high"`와 화면 폭 기준 srcset을 붙인다.
- 0ab9fec: 미리보기 이미지(LQIP)를 만들 때 Notion 이미지 프록시에 브라우저 User-Agent를 보낸다. 없으면 `www.notion.so/image/...`가 403을 줘서 Notion에 올린 이미지와 Notion이 감싼 외부 이미지의 흐린 미리보기가 모두 빠졌다.
- 32eaefc: 페이지 HTML에 실리는 Notion 데이터(`__NEXT_DATA__`)를 화면에 쓰는 블록만 남겨 줄인다. 컬렉션 카드로 보이는 글의 본문과 메뉴 링크 페이지의 본문이 함께 실려, 카드가 많은 페이지일수록 HTML이 커지고 첫 화면이 늦게 떴다. 커버 이미지는 `<head>`에서 preload하고 노션 이미지 리다이렉트 도메인에 미리 연결한다.
- 1b47985: Notion 429를 안내 화면으로 바꾸지 않고 예외로 던진다. ISR 재생성 중 429가 나면 정상 캐시가 HTTP 200 오류 화면으로 덮이던 문제를 고친다. `PageErrorKind`에서 `rate-limited`를 뺀다.
- a16351b: 넓은 표가 모바일 화면 전체를 밀던 문제와 Notion 열 너비를 무시하던 문제, 프로덕션 빌드에서 코드 구문 강조가 통째로 빠지던 문제를 고친다. 설명 속성이 없는 글은 본문 앞부분을 설명으로 쓰고, 사이트맵은 pageUrlOverrides를 항상 담는다. 문단, heading, 콜아웃, 코드 블록 간격과 경로 표시줄, 링크 카드, 갤러리 태그를 레퍼런스 서비스 실측에 맞춘다.

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
