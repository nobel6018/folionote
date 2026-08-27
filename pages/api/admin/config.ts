import fs from 'node:fs/promises'
import path from 'node:path'

import { serializeSiteConfig, type SiteConfig } from '@folionote/core/config'
import { type NextApiRequest, type NextApiResponse } from 'next'

import { commitConfig, targetBranch, targetPath } from '@/lib/admin/github'
import { getSession, hasValidOrigin } from '@/lib/admin/request'
import { loadSiteConfig } from '@/lib/load-site-config'

import siteConfig from '../../../site.config'

/**
 * 어드민 설정 읽기/저장. 두 모드가 있다.
 *
 * **개발 서버**: 프로젝트 루트의 site.config.ts를 직접 다시 쓴다. dev 서버가
 * 변경을 감지해 자동으로 컴파일하므로 미리보기가 바로 반영된다. 커밋은 사람이 한다.
 *
 * **배포**: GitHub에 site.config.ts를 커밋한다. 파일을 쓰지 않는 이유는 두 가지다.
 * 서버리스 파일시스템은 /tmp 말고 읽기 전용이고, 설령 썼더라도 site.config.ts는
 * 빌드 타임에 번들로 들어가는 모듈이라 이미 빌드된 함수가 다시 읽지 않는다.
 * 커밋이 곧 배포 트리거이고, 변경 이력과 롤백은 git이 맡는다.
 *
 * 인증이 없으면 401이 아니라 404를 준다. OSS라 경로가 이미 알려져 있으니
 * 엔드포인트가 살아 있다는 사실까지 확인시켜 줄 이유가 없다.
 *
 * @see docs/admin-deploy.md
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { isDev, rootNotionPageId, name, author, domain } = loadSiteConfig()

  const session = getSession(req)
  const canEdit = isDev || Boolean(session)

  if (!canEdit) {
    return res.status(404).json({ error: 'not found' })
  }

  if (req.method === 'GET') {
    // 필수 4개는 파일에 없어도 환경변수나 파생 기본값으로 사이트가 돌고 있을 수
    // 있다. 그런 사이트에서 어드민 폼을 파일 내용만으로 채우면 네 칸이 비어 보이고,
    // 저장하는 순간 값 없는 site.config.ts가 커밋돼 사이트가 죽는다. 지금 실제로
    // 쓰이는 값을 넣어 준다. rootNotionPageId는 URL을 넣었더라도 파싱된 32자로
    // 나가므로, 저장하면 파일에는 깔끔한 ID가 박힌다.
    return res.status(200).json({
      ...siteConfig,
      rootNotionPageId,
      name,
      author,
      domain
    } satisfies SiteConfig)
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  // 세션 쿠키가 SameSite=Lax라 크로스 사이트 POST에는 실리지 않지만, 방어를
  // 한 겹에만 기대지 않는다.
  if (!isDev && !hasValidOrigin(req)) {
    return res.status(403).json({ error: 'origin이 확인되지 않았습니다' })
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

    if (isDev) {
      const target = path.join(process.cwd(), 'site.config.ts')
      // 먼저 임시 파일에 쓰고 rename한다. 쓰는 중간에 dev 서버가 반쪽 파일을
      // 읽어 컴파일 에러를 내는 걸 피한다.
      const tmp = `${target}.admin-tmp`
      await fs.writeFile(tmp, source, 'utf8')
      await fs.rename(tmp, target)

      return res.status(200).json({ ok: true, mode: 'local', source })
    }

    const { commitUrl } = await commitConfig({
      token: session!.token,
      source,
      login: session!.login
    })

    return res.status(200).json({
      ok: true,
      mode: 'commit',
      commitUrl,
      branch: targetBranch,
      path: targetPath,
      source
    })
  } catch (err: any) {
    console.error('admin config save failed', err)

    // 409는 그 사이 다른 커밋이 같은 파일을 건드렸다는 뜻이다. 덮어쓰지 않고
    // 사용자에게 알린다.
    const message = String(err?.message || '')
    if (message.includes('409')) {
      return res.status(409).json({
        error:
          '그 사이 다른 곳에서 설정이 바뀌었습니다. 새로고침해서 최신 값을 불러온 뒤 다시 저장해 주세요.'
      })
    }

    return res.status(500).json({ error: message || 'save failed' })
  }
}
