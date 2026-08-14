import crypto from 'node:crypto'

import { sessionSecret } from './env'

/**
 * 어드민 세션 쿠키.
 *
 * 서버리스에는 세션을 담아둘 곳이 없다. 그래서 세션 id를 발급해 저장소에서 찾는
 * 대신, GitHub 액세스 토큰을 쿠키 안에 넣어 다닌다. 토큰이 그대로 실려 다니므로
 * 반드시 암호화해야 한다. 서명만 해서는 쿠키를 읽을 수 있는 쪽이 토큰을 그대로
 * 가져간다.
 *
 * AES-256-GCM을 쓴다. GCM은 암호화와 무결성 검증을 같이 하므로 서명을 따로
 * 붙이지 않아도 위조된 쿠키는 복호화 단계에서 걸린다.
 *
 * @see docs/admin-deploy.md
 */

const COOKIE_NAME = '레퍼런스 서비스_admin_session'
const MAX_AGE_SECONDS = 8 * 60 * 60 // 8시간

export type AdminSession = {
  /** GitHub 액세스 토큰 */
  token: string
  login: string
  avatarUrl?: string
  /** 만료 시각 (epoch ms). 쿠키 maxAge와 별개로 서버에서도 확인한다 */
  expiresAt: number
}

/**
 * ADMIN_SESSION_SECRET에서 32바이트 키를 만든다. 사람이 넣는 값은 길이가
 * 제각각이라 그대로 키로 쓸 수 없다.
 */
function key(): Buffer {
  if (!sessionSecret) {
    throw new Error('ADMIN_SESSION_SECRET이 없습니다')
  }
  return crypto.createHash('sha256').update(sessionSecret).digest()
}

export function seal(session: AdminSession): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([
    cipher.update(JSON.stringify(session), 'utf8'),
    cipher.final()
  ])
  const tag = cipher.getAuthTag()
  return [
    iv.toString('base64url'),
    body.toString('base64url'),
    tag.toString('base64url')
  ].join('.')
}

export function unseal(value: string | undefined): AdminSession | null {
  if (!value) return null

  try {
    const [ivPart, bodyPart, tagPart] = value.split('.')
    if (!ivPart || !bodyPart || !tagPart) return null

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key(),
      Buffer.from(ivPart, 'base64url')
    )
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
    const json = Buffer.concat([
      decipher.update(Buffer.from(bodyPart, 'base64url')),
      decipher.final()
    ]).toString('utf8')

    const session = JSON.parse(json) as AdminSession
    // 쿠키 maxAge는 브라우저가 지키는 값이라 믿을 수 없다. 서버에서 다시 본다.
    if (
      !session?.token ||
      !session?.expiresAt ||
      session.expiresAt < Date.now()
    ) {
      return null
    }
    return session
  } catch {
    // 위조, 키 교체, 포맷 변경 전부 여기로 온다. 세션 없음으로 취급한다.
    return null
  }
}

export function sessionCookie(session: AdminSession, secure: boolean): string {
  return cookie(COOKIE_NAME, seal(session), {
    maxAge: MAX_AGE_SECONDS,
    secure
  })
}

export function clearedCookie(secure: boolean): string {
  return cookie(COOKIE_NAME, '', { maxAge: 0, secure })
}

/**
 * OAuth state 쿠키. 콜백으로 돌아온 state가 우리가 보낸 것인지 확인해
 * 로그인 CSRF를 막는다.
 */
const STATE_COOKIE = '레퍼런스 서비스_admin_oauth_state'

export function stateCookie(state: string, secure: boolean): string {
  // 로그인 왕복에만 쓰이므로 짧게 잡는다
  return cookie(STATE_COOKIE, state, { maxAge: 600, secure })
}

export function clearedStateCookie(secure: boolean): string {
  return cookie(STATE_COOKIE, '', { maxAge: 0, secure })
}

function cookie(
  name: string,
  value: string,
  { maxAge, secure }: { maxAge: number; secure: boolean }
): string {
  const parts = [
    `${name}=${value}`,
    'Path=/',
    'HttpOnly',
    // OAuth 콜백은 github.com에서 넘어오는 top-level 이동이라 Strict면 쿠키가
    // 실리지 않는다. Lax는 그 경우를 허용하면서 크로스 사이트 POST는 막는다.
    'SameSite=Lax',
    `Max-Age=${maxAge}`
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}

export function readCookie(
  header: string | undefined,
  name: string
): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() === name) {
      return part.slice(index + 1).trim()
    }
  }
  return undefined
}

export const cookieNames = { session: COOKIE_NAME, state: STATE_COOKIE }
export const sessionMaxAgeMs = MAX_AGE_SECONDS * 1000

/** 타이밍 세이프 문자열 비교 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}
