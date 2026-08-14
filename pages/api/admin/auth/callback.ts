import { type NextApiRequest, type NextApiResponse } from 'next'

import { isDeployedAdminEnabled } from '@/lib/admin/env'
import { canPush, exchangeCodeForToken, getViewer } from '@/lib/admin/github'
import { isSecureRequest, redirectUriOf } from '@/lib/admin/request'
import {
  clearedStateCookie,
  cookieNames,
  readCookie,
  safeEqual,
  sessionCookie,
  sessionMaxAgeMs
} from '@/lib/admin/session'

/**
 * GitHub OAuth 콜백.
 *
 * 세 관문을 통과해야 세션이 나온다.
 * 1. state가 우리가 보낸 값과 같은가 (로그인 CSRF)
 * 2. code를 토큰으로 바꿀 수 있는가 (GitHub이 인증)
 * 3. 그 토큰으로 이 리포에 푸시할 수 있는가 (인가)
 *
 * 3번이 인가의 전부다. 별도 사용자 목록을 두지 않는다.
 *
 * @see docs/admin-deploy.md
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isDeployedAdminEnabled) {
    return res.status(404).json({ error: 'not found' })
  }

  const secure = isSecureRequest(req)
  const fail = (reason: string) => {
    res.setHeader('Set-Cookie', clearedStateCookie(secure))
    return res.redirect(302, `/admin?error=${encodeURIComponent(reason)}`)
  }

  const code = typeof req.query.code === 'string' ? req.query.code : undefined
  const state =
    typeof req.query.state === 'string' ? req.query.state : undefined
  const expected = readCookie(req.headers.cookie, cookieNames.state)

  if (!code || !state || !expected || !safeEqual(state, expected)) {
    return fail('로그인 요청이 확인되지 않았습니다. 다시 시도해 주세요.')
  }

  try {
    const token = await exchangeCodeForToken(code, redirectUriOf(req))

    if (!(await canPush(token))) {
      return fail('이 리포에 푸시 권한이 있는 계정만 설정을 고칠 수 있습니다.')
    }

    const viewer = await getViewer(token)

    res.setHeader('Set-Cookie', [
      clearedStateCookie(secure),
      sessionCookie(
        {
          token,
          login: viewer.login,
          avatarUrl: viewer.avatar_url,
          expiresAt: Date.now() + sessionMaxAgeMs
        },
        secure
      )
    ])
    return res.redirect(302, '/admin')
  } catch (err: any) {
    console.error('admin oauth callback failed', err)
    return fail(err?.message || '로그인에 실패했습니다.')
  }
}
