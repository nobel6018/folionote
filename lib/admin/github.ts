import {
  configFilePath,
  githubBranch,
  githubClientId,
  githubClientSecret,
  githubRepo
} from './env'

/**
 * GitHub OAuth와 Contents API.
 *
 * 의존성을 늘리지 않으려고 fetch로 직접 호출한다. OSS 배포판이라 포크한 사람의
 * 설치 부담을 늘리고 싶지 않다.
 *
 * @see docs/admin-deploy.md
 */

const API = 'https://api.github.com'

/**
 * 리포 안 경로를 URL에 넣을 수 있게 만든다.
 *
 * 통째로 encodeURIComponent하면 `docs/site.ts` 같은 중첩 경로의 슬래시가
 * `%2F`가 되어 GitHub이 다른 파일로 읽는다. 세그먼트별로 인코딩해야 한다.
 */
function encodePath(filePath: string): string {
  return filePath.split('/').map(encodeURIComponent).join('/')
}

/**
 * OAuth 스코프.
 *
 * `public_repo`로는 비공개 리포에 커밋할 수 없고, 개인 블로그 리포가 비공개인
 * 경우가 흔하다. 그래서 `repo`를 쓴다. 이 토큰은 사용자 브라우저 쿠키 안에서만
 * 살고 서버에 저장하지 않는다.
 */
const SCOPE = 'repo'

export function authorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: githubClientId!,
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
    allow_signup: 'false'
  })
  return `https://github.com/login/oauth/authorize?${params}`
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: githubClientId,
      client_secret: githubClientSecret,
      code,
      redirect_uri: redirectUri
    })
  })

  const data = (await res.json()) as {
    access_token?: string
    error_description?: string
    error?: string
  }

  if (!data.access_token) {
    throw new Error(
      data.error_description || data.error || 'GitHub 토큰 교환에 실패했습니다'
    )
  }
  return data.access_token
}

async function gh<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28',
      'content-type': 'application/json',
      ...init?.headers
    }
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub ${init?.method || 'GET'} ${path} ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

export type GitHubUser = { login: string; avatar_url?: string }

export async function getViewer(token: string): Promise<GitHubUser> {
  return gh<GitHubUser>(token, '/user')
}

/**
 * 이 사람이 설정을 고칠 자격이 있는지.
 *
 * 별도의 허용 목록을 두지 않고 "이 리포에 푸시할 수 있는가"로 판정한다.
 * 어차피 저장이 곧 커밋이라, 푸시 권한이 없으면 저장도 실패한다. 권한의 출처를
 * 리포 하나로 두면 관리할 사용자 목록이 생기지 않는다.
 */
export async function canPush(token: string): Promise<boolean> {
  const repo = await gh<{ permissions?: { push?: boolean } }>(
    token,
    `/repos/${githubRepo}`
  )
  return repo.permissions?.push === true
}

export async function getFileSha(token: string): Promise<string | undefined> {
  try {
    const file = await gh<{ sha: string }>(
      token,
      `/repos/${githubRepo}/contents/${encodePath(configFilePath)}?ref=${encodeURIComponent(githubBranch)}`
    )
    return file.sha
  } catch {
    // 파일이 아직 없는 경우. sha 없이 생성으로 넘긴다.
    return undefined
  }
}

export type CommitResult = { commitUrl: string; sha: string }

export async function commitConfig({
  token,
  source,
  login
}: {
  token: string
  source: string
  login: string
}): Promise<CommitResult> {
  const sha = await getFileSha(token)

  const res = await gh<{ commit: { html_url: string; sha: string } }>(
    token,
    `/repos/${githubRepo}/contents/${encodePath(configFilePath)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message: `chore(config): ${configFilePath} 수정 (어드민)\n\n${login} 님이 /admin 화면에서 저장했습니다.`,
        content: Buffer.from(source, 'utf8').toString('base64'),
        branch: githubBranch,
        // sha가 있으면 수정, 없으면 생성. sha를 넘기면 그 사이 다른 커밋이
        // 같은 파일을 건드린 경우 409가 나서 덮어쓰기를 막아준다.
        ...(sha ? { sha } : {})
      })
    }
  )

  return { commitUrl: res.commit.html_url, sha: res.commit.sha }
}





export {githubRepo as repoSlug, githubBranch as targetBranch, configFilePath as targetPath} from './env'