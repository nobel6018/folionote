# 커스텀 코드 주입과 페이지별 SEO

경쟁 서비스 조사에서 채택률 상위였던 두 기능입니다
(@see docs/competitor-feature-research.md). 어드민의 **기타** 탭에서 편집하거나
`site.config.ts`를 직접 고칩니다.

## 커스텀 코드

분석 스크립트, 채팅 위젯, 색 보정 CSS처럼 설정 옵션으로 만들어주지 않은 것을
사용자가 직접 붙이는 탈출구입니다. 이게 있으면 미구현 옵션의 상당수를 사용자가
스스로 해결합니다.

```ts
customCode: {
  bodyStart: '<script defer src="https://plausible.io/js/script.js"></script>',
  bodyEnd: '<script src="https://widget.example.com/chat.js"></script>',
  css: `.notion-page-content-inner {
  max-width: 820px;
}`,
  metaTags: [{ name: 'google-site-verification', content: '토큰' }]
}
```

| 항목 | 위치 | 용도 |
|---|---|---|
| `bodyStart` | `<body>` 시작 직후 | 먼저 실행돼야 하는 분석 스크립트 |
| `bodyEnd` | `</body>` 직전 | 늦게 떠도 되는 채팅 위젯 |
| `css` | 문서 맨 끝 | 사이트 CSS를 덮어쓰는 규칙 |
| `metaTags` | `<head>` | 검색엔진 인증 등 메타 태그 |

### 왜 `<head>`에 원본 HTML을 넣는 항목이 없는가

React는 `<head>`에 임의 HTML을 서버 렌더링할 방법이 없습니다. 클라이언트에서
넣으면 두 가지가 깨집니다. JS를 실행하지 않는 크롤러가 메타 태그를 못 보고,
`innerHTML`로 삽입한 `<script>`는 브라우저가 실행하지 않습니다. "넣었는데 조용히
동작하지 않는" 함정이라 아예 두지 않았습니다.

대신 `metaTags`(구조화)와 `css`를 head에 서버 렌더링하고, 스크립트는 body에서
받습니다. **body에 서버 렌더링된 `<script>`는 정상 실행됩니다.** 브라우저가 문서
스트림으로 파싱하기 때문이고, 클라이언트 `innerHTML`과는 다릅니다.

### CSS가 문서 맨 끝에 들어가는 이유

`<head>`에 넣으면 Next가 뒤에 붙이는 CSS 청크에 밀립니다. 같은 특이도일 때
나중에 온 규칙이 이기므로 사용자 CSS가 집니다. 문서 맨 끝에 두면 그 문제가
사라집니다.

다만 우리 스타일 중에 `:root:root`나 클래스 중복(`.container.container`)처럼
특이도를 올려둔 규칙이 있습니다(react-notion-x를 이기려고 쓴 기법입니다). 그런
규칙을 덮으려면 사용자도 같은 수준의 특이도를 써야 합니다.

### 주의

여기 넣는 값은 사이트에 그대로 실행됩니다. 코드를 커밋하는 것과 같은 신뢰
수준이고, 잘못 넣으면 사이트가 깨집니다. 저장 후 미리보기를 확인하세요.

## 페이지별 SEO

특정 페이지의 제목, 설명, 공유 이미지를 덮어씁니다. 키는 Notion 페이지 ID입니다.

```ts
pageMeta: {
  '392c0343b4fa81448162dbe4377abc6a': {
    title: '검색 결과에 보일 제목',
    description: '검색 결과와 공유 카드에 보일 설명',
    ogImage: 'https://example.com/card.png',
    noindex: false
  }
}
```

우선순위는 `pageMeta` → Notion 속성(`Description`, `Social Image`) → 사이트
기본값 순입니다. 지정하지 않은 페이지는 지금까지와 똑같이 동작합니다.

키는 하이픈이 있어도 없어도, 대문자여도 찾힙니다. Notion에서 복사한 ID에는
하이픈이 붙어 있고 URL에서 딴 값은 없어서, 한쪽만 받으면 "설정했는데 안 먹는다"가
됩니다 (@see lib/page-meta.ts).

### 왜 필요한가

지금은 모든 페이지의 `description`이 사이트 기본값 하나로 같습니다. 코드는 Notion
`Description` 속성을 읽게 되어 있지만, 데이터베이스에 그 속성이 없거나 일반
페이지처럼 속성을 붙일 수 없는 경우에는 방법이 없었습니다.

### noindex

켜면 `robots`에 `noindex,nofollow`가 붙고 **사이트맵에서도 빠집니다**. 사이트맵에
남겨두면 "빼달라고 하면서 목록에는 올리는" 모순된 신호가 됩니다.

작업용 페이지가 Notion 트리에 섞여 있을 때 씁니다.

### ID를 찾는 방법

어드민 오른쪽 미리보기에서 원하는 페이지로 이동하면 상단에 ID가 뜨고, **미리보기
페이지 ID 가져오기**를 누르면 그 ID로 줄이 추가됩니다.

## 관련 코드

| 파일 | 역할 |
|---|---|
| `lib/site-config.ts` | `CustomCodeConfig`, `PageMetaOverride` 타입 |
| `lib/config.ts` | `customCode`, `pageMeta` 해석 |
| `lib/page-meta.ts` | ID 정규화 조회, `isNoindexPage` |
| `pages/_document.tsx` | bodyStart/bodyEnd/css/metaTags 주입 |
| `components/NotionPage.tsx` | 제목·설명·공유 이미지 덮어쓰기 적용 |
| `components/PageHead.tsx` | `robots` 태그 |
| `pages/sitemap.xml.tsx` | noindex 페이지 제외 |
| `lib/serialize-site-config.ts` | 여러 줄 문자열을 템플릿 리터럴로 저장 |

## 직렬화기에서 함께 고친 것

어드민 저장은 `site.config.ts`를 통째로 다시 씁니다. 그 직렬화기가 문자열을
`'...'` 한 겹으로만 감싸고 있어서 두 가지가 깨졌습니다. 개행이 들어가면 작은따옴표
문자열 안에 raw 개행이 들어가 **문법 오류 파일이 저장되고**, 백슬래시를
이스케이프하지 않아 CSS의 `\2014` 같은 값이 다른 문자로 바뀝니다.

여러 줄은 템플릿 리터럴로 쓰고, 백슬래시·백틱·`${`를 이스케이프합니다. CSS를
설정에 담기 시작하면서 실제로 걸리는 문제였습니다.
