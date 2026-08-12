/**
 * 어드민 배포 모드 설정 해석.
 *
 * 포크한 사람이 손으로 채워야 하는 값을 최소로 줄이는 게 목표다. 리포와 브랜치는
 * Vercel이 넣어주는 빌드 환경변수에서 자동으로 읽고, 사람은 OAuth 앱 정보와
 * 세션 비밀만 넣는다.
 *
 * @see docs/admin-deploy.md
 */

function env(name: string): string | undefined {
  const value = process.env[name]
  return value && value.length > 0 ? value : undefined
}

export const githubClientId = env('GITHUB_OAUTH_CLIENT_ID')
export const githubClientSecret = env('GITHUB_OAUTH_CLIENT_SECRET')
export const sessionSecret = env('ADMIN_SESSION_SECRET')

/**
 * 커밋 대상 리포 (`owner/repo`).
 *
 * Vercel은 git 연동 프로젝트에 VERCEL_GIT_REPO_OWNER / VERCEL_GIT_REPO_SLUG를
 * 넣어준다. 그래서 Vercel에 올린 경우 따로 설정할 게 없다. 다른 호스트에서는
 * GITHUB_REPO로 직접 준다.
 */
export const githubRepo =
  env('GITHUB_REPO') ||
  (env('VERCEL_GIT_REPO_OWNER') && env('VERCEL_GIT_REPO_SLUG')
    ? `${env('VERCEL_GIT_REPO_OWNER')}/${env('VERCEL_GIT_REPO_SLUG')}`
    : undefined)

/** 커밋할 브랜치. 프리뷰 배포에서 실수로 main을 고치지 않도록 현재 브랜치를 따른다 */
export const githubBranch =
  env('GITHUB_BRANCH') || env('VERCEL_GIT_COMMIT_REF') || 'main'

/** 리포 안에서 설정 파일 경로 */
export const configFilePath = env('ADMIN_CONFIG_PATH') || 'site.config.ts'

/**
 * 배포 어드민이 켜졌는지.
 *
 * 별도의 ADMIN_ENABLED 플래그를 두지 않았다. 필요한 비밀이 다 있을 때만 켜지는
 * 편이 fail-closed다. 플래그를 따로 두면 "플래그는 켰는데 비밀은 안 넣은" 어중간한
 * 상태가 생기고, 그 상태를 어떻게 다룰지가 또 하나의 결정거리가 된다.
 * 아무 생각 없이 포크해서 배포하면 비밀이 없으므로 어드민은 존재하지 않는다.
 */
export const isDeployedAdminEnabled = Boolean(
  githubClientId && githubClientSecret && sessionSecret && githubRepo
)

/** 설정이 반쯤 된 경우 무엇이 빠졌는지 (서버 로그용) */
export function missingAdminEnv(): string[] {
  const missing: string[] = []
  if (!githubClientId) missing.push('GITHUB_OAUTH_CLIENT_ID')
  if (!githubClientSecret) missing.push('GITHUB_OAUTH_CLIENT_SECRET')
  if (!sessionSecret) missing.push('ADMIN_SESSION_SECRET')
  if (!githubRepo) missing.push('GITHUB_REPO')
  return missing
}
