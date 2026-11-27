# 소셜 이미지 (og:image)

링크를 메신저나 SNS에 공유할 때 뜨는 미리보기 그림이다. `/api/social-image?id=<페이지 ID>&v=<수정 시각>`이
1200×630 PNG를 그린다.

## 무엇을 그리나

| 페이지                | 그림                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| 루트 페이지           | 사이트 이름 카드. 배경은 루트 페이지 표지, 없으면 `defaultPageCover` |
| 대표 이미지가 있는 글 | `Social Image` 속성, 페이지 표지, 본문 첫 이미지 순으로 고른 그림    |
| 대표 이미지가 없는 글 | 글 제목 카드                                                         |

대표 이미지가 1.5:1보다 넓으면 꽉 채운다. 책 표지처럼 좁으면 잘라 낼 때 알아볼 수 없어서
흐린 배경 위에 통째로 올린다. 제목은 메신저가 카드 아래에 따로 적어 주므로 그림 위에 다시
쓰지 않는다. 사이트 기본 표지(`defaultPageCover`)는 글과 무관해서 본문 글에는 쓰지 않는다.

## 함정

- **이미지는 서버가 직접 받는다.** satori는 `<img src>`를 받으면서 User-Agent를 붙이지 않는데,
  Notion 이미지 프록시는 UA 없는 요청을 403으로 막는다. 그래서 `NOTION_FETCH_USER_AGENT`를
  붙여 받고 `sharp`로 JPEG data URL로 바꿔 넘긴다. satori가 못 읽는 WebP도 이 변환으로 해결된다
- **Node 런타임이다.** `sharp`가 네이티브 모듈이라 edge에서 못 돈다
- **한글과 한자는 그때그때 받는다.** 번들 폰트(Inter)에 CJK 글리프가 없다. 그릴 글자만 Google
  Fonts의 `text=` 서브셋으로 받고, Noto Sans KR에 없는 드문 한자는 Noto Sans SC로 채운다.
  받지 못하면 Inter만으로 그려 한글이 빠진다
- **캐시가 두 겹이다.** 응답은 1년 immutable이고, 메신저는 페이지 주소로 미리보기를 캐시한다.
  og:image 주소에 페이지 수정 시각 `v`를 붙여 글을 고치면 이미지 주소가 바뀌게 했다. 이미 공유한
  링크는 메신저가 페이지를 다시 읽어야 바뀐다. 카카오톡은 카카오 공유 디버거의 "캐시 초기화"로 지운다

## 코드 위치

- `pages/api/social-image.tsx` `getOgPage`(그림 고르기), `renderPage`(레이아웃), `fetchImage`, `makeBackdrop`
- `lib/fonts/load-cjk-fonts.ts` `loadCjkFonts`
- `packages/core/src/shared/get-social-image-url.ts` `getSocialImageUrl`(`v` 붙이기)
- `packages/core/src/react/components/NotionPage.tsx`가 `PageHead`에 `socialImageVersion`(블록 `last_edited_time`)을 넘긴다
