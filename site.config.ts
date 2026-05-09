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
  pageUrlOverrides: null,

  // 'custom' 모드: 사이트 헤더에 navigationLinks + 다크모드 토글 노출 (레퍼런스 서비스 스타일 헤더).
  // 'default' 모드는 react-notion-x 기본 헤더만 사용 (토글 없음 → footer 깊숙이 묻힘).
  navigationStyle: 'custom',
  navigationLinks: [
    // 레퍼런스 사이트 매핑 (사용자 본인 사이트 기준 데모). fork 후 본인 페이지 ID로 교체.
    { title: '개발', url: '/devs' },
    { title: 'AWS', url: '/aws' },
    { title: '독서', url: '/books' }
  ]
})
