import crypto from 'node:crypto'

import { type NextApiRequest, type NextApiResponse } from 'next'

import { isDeployedAdminEnabled, missingAdminEnv } from '@/lib/admin/env'
import { authorizeUrl } from '@/lib/admin/github'
import { isSecureRequest, redirectUriOf } from '@/lib/admin/request'
import { stateCookie } from '@/lib/admin/session'

/**
 * GitHub OAuth 시작. `/admin`의 로그인 버튼이 여기로 보낸다.
 *
 * state를 만들어 쿠키에 넣고 같은 값을 GitHub에 넘긴다. 콜백에서 두 값을 맞춰봐
 * 로그인 CSRF(공격자가 자기 계정으로 피해자를 로그인시키는 것)를 막는다.
 *
 * @see docs/admin-deploy.md
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isDeployedAdminEnabled) {
    // 설정이 반쯤 된 채 배포한 경우를 서버 로그로 알린다. 응답은 404 그대로 둔다.
    const missing = missingAdminEnv()
    if (missing.length < 4) {
      console.warn('배포 어드민이 꺼져 있습니다. 빠진 환경변수:', missing)
    }
    return res.status(404).json({ error: 'not found' })
  }

  const state = crypto.randomBytes(16).toString('base64url')
  res.setHeader('Set-Cookie', stateCookie(state, isSecureRequest(req)))
  res.redirect(302, authorizeUrl(state, redirectUriOf(req)))
}
