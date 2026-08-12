import { type IncomingMessage } from 'node:http'

import { type NextApiRequest } from 'next'

import { isDeployedAdminEnabled } from './env'
import { type AdminSession, cookieNames, readCookie, unseal } from './session'

/** 이 요청이 https로 들어왔는지. 쿠키에 Secure를 붙일지 정한다 */
export function isSecureRequest(req: IncomingMessage): boolean {
  const proto = (req.headers['x-forwarded-proto'] as string) || ''
  return proto.split(',')[0]?.trim() === 'https'
}

export function originOf(req: IncomingMessage): string {
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host
  return `${isSecureRequest(req) ? 'https' : 'http'}://${host}`
}

export function redirectUriOf(req: IncomingMessage): string {
  return `${originOf(req)}/api/admin/auth/callback`
}

export function getSession(req: IncomingMessage): AdminSession | null {
  if (!isDeployedAdminEnabled) return null
  return unseal(readCookie(req.headers.cookie, cookieNames.session))
}

/**
 * 변경 요청의 Origin이 이 사이트인지 확인한다.
 *
 * 세션 쿠키가 SameSite=Lax라 크로스 사이트 POST에는 실리지 않지만, 브라우저와
 * 상황에 따라 예외가 있어서 서버에서 한 번 더 본다. 방어를 한 겹에 의존하지 않는다.
 */
export function hasValidOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin
  // fetch로 보내는 same-origin 요청에는 Origin이 붙는다. 없으면 브라우저가 아닌
  // 호출이므로 통과시키지 않는다.
  if (!origin) return false
  return origin === originOf(req)
}
