import { siteConfig } from '@folionote/core/config'

// 이 파일은 /admin 화면에서 저장할 때 자동으로 다시 쓰인다.
// 손으로 편집해도 되지만, 저장하면 포맷과 주석이 이 형식으로 정리된다.
// @see lib/serialize-site-config.ts
//
// 아래 값은 데모 사이트(folionote.leedo.me)의 실제 설정이다. fork한 뒤
// rootNotionPageId / name / domain 셋만 자기 값으로 바꾸면 바로 뜬다.
// @see docs/setup-guide.md

export default siteConfig({
  // 사이트 루트가 될 Notion 페이지 (필수)
  rootNotionPageId: '3bcc0343b4fa81abafd4f7fb22799e14',

  // 특정 Notion 워크스페이스로 제한할 때만 지정
  rootNotionSpaceId: null,

  // 사이트 기본 정보 (필수)
  name: 'folionote',

  domain: 'folionote.leedo.me',

  author: 'nobel6018',

  // Open Graph 설명
  description: 'Notion 페이지를 그대로 웹사이트로 발행하는 오픈소스',

  language: 'ko',

  github: 'nobel6018/folionote',

  defaultPageIcon: null,

  defaultPageCover: null,

  defaultPageCoverPosition: 0.5,

  // 커버 이미지의 LQIP 미리보기 생성 여부
  isPreviewImageSupportEnabled: true,

  // Redis 캐시. 켜면 REDIS_HOST / REDIS_PASSWORD 환경변수가 필요하다.
  // 페이지뷰 카운트도 이 값이 켜져 있어야 동작한다.
  isRedisEnabled: false,

  includeNotionIdInUrls: true,

  // pretty URL 매핑. 키가 경로, 값이 Notion 블록 ID(하이픈 없는 32자 hex).
  // navigationLinks에서 url로 참조하는 경로는 여기에도 반드시 있어야 한다.
  //
  // 데모는 한 페이지짜리라 매핑이 없다. 컬렉션을 쓰면 이렇게 적는다.
  //   pageUrlOverrides: { '/blog': '컬렉션 페이지 ID' }

  // 컬렉션 카드/속성의 날짜 형식 (@see lib/format-date.ts)
  dateFormat: 'YYYY/MM/DD',

  // 색상 테마. 'system'은 OS 설정을 따르고 헤더에 토글을 노출한다.
  // 'light'/'dark'로 고정하거나 'custom'으로 색을 직접 지정하면 토글이 사라진다.
  colorTheme: {
    mode: 'system'
  },

  // 헤더 좌측 로고. 생략하면 사이트 이름이 텍스트로 나온다
  logo: {
    light: '/logo.png',
    dark: '/logo-dark.png',
    height: 20,
    href: '/',
    alt: 'folionote'
  },

  // 'custom'이면 레퍼런스 서비스 풍 자체 헤더, 'default'면 react-notion-x 기본 헤더
  navigationStyle: 'custom',

  // 헤더에 노출할 nav 링크. 외부 주소도 넣을 수 있다.
  navigationLinks: [
    {
      title: 'GitHub',
      url: 'https://github.com/nobel6018/folionote'
    }
  ],

  // 맨 위로 버튼
  backToTop: {
    enabled: true
  },

  // 모바일 하단 탭바 (좁은 화면에서만 보인다)
  bottomNavigation: {
    links: [
      {
        title: '홈',
        url: '/',
        icon: '🏠'
      },
      {
        title: 'GitHub',
        url: 'https://github.com/nobel6018/folionote',
        icon: '🧩'
      }
    ]
  }
})
