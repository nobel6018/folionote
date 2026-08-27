/**
 * 어드민 폼 UI 진입점 (`@folionote/core/admin`).
 *
 * 화면 조각만 담는다. GitHub OAuth와 커밋은 앱 쪽에 남는다. 토큰을 다루는 코드를
 * 패키지에 넣으면 이 패키지를 쓰는 모든 배포가 같은 인증 방식에 묶인다.
 */
export * from './AdminFields.js'
export * from './CodeView.js'

// CSS 모듈 클래스 맵. 서브패스 export를 하나 더 여는 대신 값으로 내보낸다.
// 소비자가 `@folionote/core/admin/Admin.module.css` 같은 경로를 외울 필요가 없다.
export { default as adminStyles } from './Admin.module.css'
