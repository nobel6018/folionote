import { siteConfig } from './lib/site-config'

// 이 파일은 /admin 화면에서 저장할 때 자동으로 다시 쓰인다.
// 손으로 편집해도 되지만, 저장하면 포맷과 주석이 이 형식으로 정리된다.
// @see lib/serialize-site-config.ts

export default siteConfig({
  // 사이트 루트가 될 Notion 페이지 (필수)
  rootNotionPageId: '99b5bedd671d454ab450b0c485b800a8',

  // 특정 Notion 워크스페이스로 제한할 때만 지정
  rootNotionSpaceId: null,

  // 사이트 기본 정보 (필수)
  name: '이도(李裪)',

  domain: 'leedo.me',

  author: '이영훈',

  // Open Graph 설명
  description: '이도(李裪) - 이영훈의 기술 블로그',

  language: 'ko',

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
  pageUrlOverrides: {
    '/devs': 'df93c7ac0dfd4fdf8a9bdc367cdca3ec',
    '/clouds': 'de87b7bd73cb416392a9df715e0a9c0e',
    '/books': '5b5cb9bdc8204dcdabc57ceb7b91f858'
  },

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
    alt: '이도'
  },

  // 'custom'이면 레퍼런스 서비스 풍 자체 헤더, 'default'면 react-notion-x 기본 헤더
  navigationStyle: 'custom',

  // 헤더에 노출할 nav 링크
  navigationLinks: [
    {
      title: '개발',
      url: '/devs'
    },
    {
      title: 'AWS',
      url: '/clouds'
    },
    {
      title: '독서',
      url: '/books'
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
      }
    ]
  }
})
