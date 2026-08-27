import { type PostHogConfig } from 'posthog-js'

/**
 * 분석 도구 설정. 사이트가 아니라 프로세스(배포)에 붙는 값이라 설정 객체에 담지 않는다.
 *
 * `NEXT_PUBLIC_` 접두사가 붙은 변수라 Next가 빌드 시점에 브라우저 번들로 인라인한다.
 * 사이트 이름이나 도메인과 달리 이 값들은 배포 하나에 하나뿐이므로 그래도 된다.
 *
 * @see docs/architecture.md
 */

const isDev = process.env.NODE_ENV === 'development'

/** 개발 중에는 집계하지 않는다. 로컬 방문이 통계에 섞이면 숫자를 못 믿는다 */
export const fathomId = isDev ? undefined : process.env.NEXT_PUBLIC_FATHOM_ID

export const fathomConfig = fathomId
  ? {
      excludedDomains: ['localhost', 'localhost:3000']
    }
  : undefined

export const posthogId = process.env.NEXT_PUBLIC_POSTHOG_ID

export const posthogConfig: Partial<PostHogConfig> = {
  api_host: 'https://app.posthog.com'
}
