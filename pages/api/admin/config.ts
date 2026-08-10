import fs from 'node:fs/promises'
import path from 'node:path'

import { type NextApiRequest, type NextApiResponse } from 'next'

import { isDev } from '@/lib/config'
import { serializeSiteConfig } from '@/lib/serialize-site-config'
import { type SiteConfig } from '@/lib/site-config'

import siteConfig from '../../../site.config'

/**
 * 어드민 설정 읽기/저장 (`/admin` 화면용).
 *
 * **개발 서버에서만 동작한다.** 배포된 사이트에서 설정 파일을 고칠 수 있게
 * 열어 두면 인증 없는 원격 코드 수정 창구가 된다. isDev가 아니면 404를 주고,
 * 아래 파일 쓰기 코드에는 접근조차 하지 않는다.
 *
 * 저장은 프로젝트 루트의 site.config.ts를 다시 쓴다. dev 서버가 변경을 감지해
 * 자동으로 다시 컴파일하므로 미리보기를 새로고침하면 바로 보인다.
 * 커밋과 배포는 사용자가 한다.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isDev) {
    return res.status(404).json({ error: 'not found' })
  }

  if (req.method === 'GET') {
    return res.status(200).json(siteConfig)
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const config = req.body as SiteConfig

  // rootNotionPageId가 없으면 사이트가 아예 뜨지 않는다. 저장 전에 막는다.
  if (!config?.rootNotionPageId || !config?.name || !config?.domain) {
    return res.status(400).json({
      error: 'rootNotionPageId, name, domain은 비울 수 없습니다'
    })
  }

  try {
    const source = serializeSiteConfig(config)
    const target = path.join(process.cwd(), 'site.config.ts')

    // 먼저 임시 파일에 쓰고 rename한다. 쓰는 중간에 dev 서버가 반쪽 파일을
    // 읽어 컴파일 에러를 내는 걸 피한다.
    const tmp = `${target}.admin-tmp`
    await fs.writeFile(tmp, source, 'utf8')
    await fs.rename(tmp, target)

    return res.status(200).json({ ok: true, source })
  } catch (err: any) {
    console.error('admin config save failed', err)
    return res.status(500).json({ error: err?.message || 'save failed' })
  }
}
