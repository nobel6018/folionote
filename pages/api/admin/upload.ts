import fs from 'node:fs/promises'
import path from 'node:path'

import { type NextApiRequest, type NextApiResponse } from 'next'

import { commitFile, targetBranch } from '@/lib/admin/github'
import { getSession, hasValidOrigin } from '@/lib/admin/request'
import { loadSiteConfig } from '@/lib/load-site-config'

/**
 * 로고 등 이미지 업로드. `public/` 아래에 넣는다.
 *
 * 로컬에서는 파일로 쓰고, 배포 환경에서는 리포에 커밋한다. 설정 저장과 같은
 * 이유다. 서버리스 파일시스템은 읽기 전용이고, 쓴다 해도 이미 빌드된 배포물이
 * 그 파일을 서비스하지 않는다.
 *
 * 인증은 설정 저장과 같은 규칙을 쓴다. 로컬이거나 세션이 있어야 하고, 없으면
 * 404다. 여기가 열리면 리포에 임의 파일을 커밋할 수 있는 창구가 된다.
 *
 * @see docs/admin-deploy.md
 */

/** 허용 확장자. 이미지만 받는다 */
const ALLOWED = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'ico'])

/** 파일 크기 상한. 로고에 2MB면 넉넉하다 */
const MAX_BYTES = 2 * 1024 * 1024

export const config = {
  api: {
    // base64는 원본보다 약 33% 크다. 2MB 파일이 들어오게 3mb로 잡는다.
    bodyParser: { sizeLimit: '3mb' }
  }
}

/**
 * 사용자가 준 파일명을 안전한 이름으로 바꾼다.
 *
 * 경로 구분자와 상위 경로 참조를 지워 `public/` 밖으로 쓰지 못하게 한다.
 * 한글 파일명은 URL에서 인코딩이 필요해 다루기 번거로우므로 영숫자만 남긴다.
 */
function safeName(filename: string): { name: string; ext: string } | null {
  const base = path.basename(filename).toLowerCase()
  const ext = base.includes('.') ? base.split('.').pop()! : ''
  if (!ALLOWED.has(ext)) return null

  const stem = base
    .slice(0, base.length - ext.length - 1)
    .replaceAll(/[^a-z0-9-_]/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '')
    .slice(0, 48)

  return { name: `${stem || 'image'}.${ext}`, ext }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { isDev } = loadSiteConfig()

  const session = getSession(req)
  if (!isDev && !session) {
    return res.status(404).json({ error: 'not found' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  if (!isDev && !hasValidOrigin(req)) {
    return res.status(403).json({ error: 'origin이 확인되지 않았습니다' })
  }

  const { filename, dataUrl } = (req.body || {}) as {
    filename?: string
    dataUrl?: string
  }

  if (!filename || !dataUrl) {
    return res.status(400).json({ error: 'filename과 dataUrl이 필요합니다' })
  }

  const safe = safeName(filename)
  if (!safe) {
    return res.status(400).json({
      error: `이미지 파일만 올릴 수 있습니다 (${[...ALLOWED].join(', ')})`
    })
  }

  const comma = dataUrl.indexOf(',')
  if (!dataUrl.startsWith('data:') || comma === -1) {
    return res.status(400).json({ error: 'dataUrl 형식이 아닙니다' })
  }

  const bytes = Buffer.from(dataUrl.slice(comma + 1), 'base64')
  if (bytes.length === 0) {
    return res.status(400).json({ error: '빈 파일입니다' })
  }
  if (bytes.length > MAX_BYTES) {
    return res.status(413).json({
      error: `파일이 너무 큽니다 (${Math.round(bytes.length / 1024)}KB, 최대 ${MAX_BYTES / 1024 / 1024}MB)`
    })
  }

  const repoPath = `public/${safe.name}`
  const urlPath = `/${safe.name}`

  try {
    if (isDev) {
      const target = path.join(process.cwd(), 'public', safe.name)
      await fs.writeFile(target, bytes)
      return res.status(200).json({ path: urlPath, mode: 'local' })
    }

    const { commitUrl } = await commitFile({
      token: session!.token,
      repoPath,
      content: bytes,
      message: `chore(assets): ${safe.name} 업로드 (어드민)`,
      login: session!.login
    })

    return res.status(200).json({
      path: urlPath,
      mode: 'commit',
      commitUrl,
      branch: targetBranch
    })
  } catch (err: any) {
    console.error('admin upload failed', err)
    return res.status(500).json({ error: err?.message || 'upload failed' })
  }
}
