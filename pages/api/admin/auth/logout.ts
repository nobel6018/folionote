import { type NextApiRequest, type NextApiResponse } from 'next'

import { isDeployedAdminEnabled } from '@/lib/admin/env'
import { isSecureRequest } from '@/lib/admin/request'
import { clearedCookie } from '@/lib/admin/session'

/**
 * 로그아웃. 세션 쿠키만 지운다.
 *
 * GitHub 토큰 자체를 폐기하지는 않는다. 폐기하려면 OAuth 앱 권한을 회수해야 하고,
 * 그건 사용자가 GitHub 설정에서 할 일이다. 쿠키가 사라지면 이 사이트에서는
 * 토큰에 접근할 방법이 없어진다.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isDeployedAdminEnabled) {
    return res.status(404).json({ error: 'not found' })
  }

  res.setHeader('Set-Cookie', clearedCookie(isSecureRequest(req)))
  res.redirect(302, '/admin')
}
