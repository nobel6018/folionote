import { siteConfig } from './lib/site-config'

export default siteConfig({
  // the site's root Notion page (required)
  rootNotionPageId: '99b5bedd671d454ab450b0c485b800a8',

  // if you want to restrict pages to a single notion workspace (optional)
  // (this should be a Notion ID; see the docs for how to extract this)
  rootNotionSpaceId: null,

  // basic site info (required)
  name: '이도(李裪)',
  domain: 'leedo.me',
  author: '이영훈',

  // 사이트 언어. html lang과 UI 라벨(코드 복사 버튼 등)에 쓰인다
  language: 'ko',

  // open graph metadata (optional)
  description: '이도(李裪) - 이영훈의 기술 블로그',

  // social usernames (optional)
  // twitter: 'transitive_bs',
  // github: 'transitive-bullshit',
  // linkedin: 'fisch2',
  // mastodon: '#', // optional mastodon profile URL, provides link verification
  // newsletter: '#', // optional newsletter URL
  // youtube: '#', // optional youtube channel name or `channel/UCGbXXXXXXXXXXXXXXXXXXXXXX`

  // default notion icon and cover images for site-wide consistency (optional)
  // page-specific values will override these site-wide defaults
  defaultPageIcon: null,
  defaultPageCover: null,
  defaultPageCoverPosition: 0.5,

  // whether or not to enable support for LQIP preview images (optional)
  isPreviewImageSupportEnabled: true,

  // whether or not redis is enabled for caching generated preview images (optional)
  // NOTE: if you enable redis, you need to set the `REDIS_HOST` and `REDIS_PASSWORD`
  // environment variables. see the readme for more info
  isRedisEnabled: false,

  // map of notion page IDs to URL paths (optional)
  // any pages defined here will override their default URL paths
  // example:
  //
  // pageUrlOverrides: {
  //   '/foo': '067dd719a912471ea9a3ac10710e7fdf',
  //   '/bar': '0be6efce9daf42688f65c76b89f8eb27'
  // }
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

  // 색상 테마. 기본은 'system'(OS 설정을 따르고 헤더에 토글 노출).
  // 'light'/'dark'로 고정하거나 'custom'으로 색을 직접 지정하면 토글이 사라진다.
  //
  // colorTheme: { mode: 'custom', background: '#CCDDFF', foreground: '#3C3C3C' },

  // 본문 폰트. 생략하면 Pretendard(한글 + 라틴, OFL) 한 종을 쓴다.
  // 어드민처럼 언어별로 나눠 지정하면 글자마다 해당 폰트로 갈라진다.
  // 레지스트리 키 목록과 직접 임베드 방법은 lib/fonts.ts 참고.
  //
  // font: { ko: 'nanum-myeongjo', en: 'lato', ja: 'noto-serif-jp' },

  // 화면 하단에 떠 있는 CTA 버튼. 생략하면 노출하지 않는다.
  //
  // cta: {
  //   text: '문의하기',
  //   href: 'https://example.com',
  //   gradient: ['#669dfd', '#77a4fe'],
  //   color: '#ffffff',
  //   newTab: true
  // },

  // 팝업. 생략하면 노출하지 않는다.
  // id는 "다시 보지 않기" 기록 키라서, 내용을 바꾸면 id도 같이 바꿔야
  // 이미 닫은 방문자에게 새 내용이 보인다.
  //
  // popups: [
  //   { id: 'notice-1', title: '공지', body: '새 글을 올렸습니다.', href: '/devs' }
  // ],
  // popupOptions: { mainPageOnly: true },

  // 모바일 하단 탭바. 생략하면 노출하지 않는다(좁은 화면에서만 보인다).
  //
  // bottomNavigation: {
  //   color: '#53a1c9',
  //   links: [
  //     { title: '홈', url: '/', icon: '🏠' },
  //     { title: '개발', url: '/devs', icon: '💻' }
  //   ]
  // },

  // 페이지뷰 카운트. 기본은 꺼짐이다.
  // 켜려면 isRedisEnabled: true + REDIS_* 환경변수까지 필요하다. 서버리스에서
  // 인메모리 카운터는 인스턴스마다 따로 세고 재시작마다 사라져 숫자가 의미를 잃는다.
  //
  // pageViewCount: { enabled: true, style: 'inline', timeZone: 'Asia/Seoul' },

  // 헤더 좌측 로고. 문자열 하나만 주면 라이트/다크 공용.
  // 생략하면 사이트 이름(name)이 텍스트로 노출된다.
  logo: {
    light: '/logo.png',
    height: 20,
    href: '/',
    alt: '이도'
  },

  // 'custom' 모드: 사이트 헤더에 navigationLinks + 다크모드 토글 노출 (레퍼런스 서비스 스타일 헤더).
  // 'default' 모드는 react-notion-x 기본 헤더만 사용 (토글 없음 → footer 깊숙이 묻힘).
  navigationStyle: 'custom',

  // 사이트 헤더에 노출할 nav 링크. 비워 두면 다크모드 토글만 노출.
  //
  // 본인 사이트로 운영 시 다음 두 가지 중 하나로 셋업:
  //   1) pageId 사용 — 자식 페이지 노션 UUID로 직접 매핑. 가장 안정적.
  //      { title: '개발', pageId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }
  //   2) url 사용 — pretty URL로 매핑. pageUrlOverrides에도 같은 매핑 필요.
  //      { title: '개발', url: '/devs' }  // pageUrlOverrides: { '/devs': 'pageId' }
  navigationLinks: [
    { title: '개발', url: '/devs' },
    { title: 'AWS', url: '/clouds' },
    { title: '독서', url: '/books' }
  ]
})
