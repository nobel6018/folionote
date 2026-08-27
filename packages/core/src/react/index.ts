/**
 * 클라이언트에서도 안전한 진입점 (`@folionote/core`).
 *
 * 컴포넌트와 훅, 그리고 컴포넌트가 쓰는 순수 헬퍼만 담는다. Notion을 직접 읽거나
 * 캐시에 붙는 코드는 `@folionote/core/server`에 있다.
 *
 * 설정 타입은 값이 아니라 타입으로만 다시 내보낸다. `siteConfig()`나
 * `resolveSiteConfig()`까지 여기서 내보내면 직렬화기와 폰트 레지스트리가 브라우저
 * 번들을 따라 들어간다.
 */
export type * from '../config/site-config.js'
export type * from '../config/site-config-resolve.js'
export * from '../shared/format-date.js'
export * from '../shared/get-canonical-page-id.js'
export * from '../shared/get-page-tweet.js'
export * from '../shared/get-social-image-url.js'
export * from '../shared/map-image-url.js'
export * from '../shared/map-page-url.js'
export * from '../shared/notion-errors.js'
export * from '../shared/page-meta.js'
export * from '../shared/search-notion.js'
export type * from '../types.js'
export * from './bootstrap-client.js'
export * from './components/CustomThemeStyles.js'
export * from './components/ErrorPage.js'
export * from './components/folio/BottomNavigation.js'
export * from './components/folio/Breadcrumbs.js'
export * from './components/folio/CollectionSearch.js'
export * from './components/folio/CtaButton.js'
export * from './components/folio/PageViewCount.js'
export * from './components/folio/Popups.js'
export * from './components/folio/ScrollProgressBar.js'
export * from './components/folio/ScrollWidgets.js'
export * from './components/folio/ShareButton.js'
export * from './components/folio/SiteLink.js'
export * from './components/folio/use-scroll-state.js'
export * from './components/FontStyles.js'
export * from './components/Footer.js'
export * from './components/Loading.js'
export * from './components/LoadingIcon.js'
export * from './components/NotionImage.js'
export * from './components/NotionPage.js'
export * from './components/NotionPageHeader.js'
export * from './components/Page404.js'
export * from './components/PageActions.js'
export * from './components/PageAside.js'
export * from './components/PageHead.js'
export * from './components/PageSocial.js'
export * from './prism-languages.js'
export * from './site-config-context.js'
export * from './use-dark-mode.js'

// 이름이 겹치는 둘은 folio 접두사를 붙여 내보낸다. react-notion-x에도 같은 이름의
// 컴포넌트가 있어서 그대로 내보내면 어느 쪽인지 읽는 사람이 헷갈린다.
export { Code as FolioCode } from './components/folio/Code.js'
export { Collection as FolioCollection } from './components/folio/Collection.js'
