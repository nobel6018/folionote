/**
 * 순수 설정 진입점 (`@folionote/core/config`).
 *
 * Node도 브라우저도 아닌 곳에서 부를 수 있다. `process.env`도 파일 시스템도 읽지
 * 않고, 값을 인자로 받아 값을 돌려준다.
 */
export * from '../types.js'
export * from './fonts.js'
export * from './serialize-site-config.js'
export * from './site-config.js'
export * from './site-config-resolve.js'
