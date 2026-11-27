import { type PageError, type ResolvedSiteConfig } from '@folionote/core/config'
import {
  createMapImageUrl,
  getNotion,
  NOTION_FETCH_USER_AGENT
} from '@folionote/core/edge'
import ky from 'ky'
import { type NextApiRequest, type NextApiResponse } from 'next'
import { ImageResponse } from 'next/og'
import {
  type Block,
  type ExtendedRecordMap,
  type PageBlock
} from 'notion-types'
import {
  getBlockTitle,
  getBlockValue,
  getPageProperty,
  parsePageId
} from 'notion-utils'
import sharp from 'sharp'

import interSemiBoldFont from '@/lib/fonts/inter-semibold'
import { loadCjkFonts } from '@/lib/fonts/load-cjk-fonts'
import { loadSiteConfig } from '@/lib/load-site-config'

// Node 런타임에서 돈다. 표지를 sharp로 변환하는데 sharp는 네이티브 모듈이라 edge에서
// 못 돈다. Node에서도 next/og는 그대로 동작하고, 응답만 res로 직접 쓴다. 결과는 1년
// immutable로 캐시되므로 함수가 실제로 도는 일은 드물다.
// @see docs/social-image.md

const WIDTH = 1200
const HEIGHT = 630
// 이 비율보다 넓은 이미지는 꽉 채워도 잘리는 부분이 적다. 더 좁은 이미지(책 표지 등)는
// 잘라 내면 무엇인지 알아볼 수 없어서 흐린 배경 위에 통째로 올린다.
const FULL_BLEED_MIN_RATIO = 1.5

type OgImage = { dataUrl: string; width: number; height: number }

type OgPage =
  | { kind: 'site'; title: string; detail?: string; image?: OgImage }
  | { kind: 'image'; image: OgImage; backdrop?: string }
  | { kind: 'title'; title: string; detail?: string }

export default async function OGImage(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const config = loadSiteConfig()
  const id = typeof req.query.id === 'string' ? req.query.id : undefined
  const pageId = parsePageId(id || config.rootNotionPageId)
  if (!pageId) {
    return res.status(400).send('Invalid notion page id')
  }

  const pageOrError = await getOgPage(config, pageId)
  if ('error' in pageOrError) {
    return res
      .status(pageOrError.error.statusCode)
      .send({ error: pageOrError.error.message })
  }
  const page = pageOrError

  const text = page.kind === 'image' ? '' : `${page.title}${page.detail ?? ''}`
  const cjkFonts = await loadCjkFonts(text)

  const image = new ImageResponse(renderPage(page), {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      {
        name: 'Inter',
        data: interSemiBoldFont,
        style: 'normal',
        weight: 700
      },
      ...cjkFonts
    ]
  })

  // ImageResponse가 정한 Content-Type, Cache-Control을 그대로 옮긴다. 1년 immutable
  // 캐시라 og:image 주소에 수정 시각(v)이 붙어 있다 (@see get-social-image-url.ts)
  for (const [key, value] of image.headers) {
    res.setHeader(key, value)
  }
  res.status(image.status).send(Buffer.from(await image.arrayBuffer()))
}

function renderPage(page: OgPage) {
  if (page.kind === 'image') {
    const { image, backdrop } = page
    if (!backdrop) {
      return (
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          <img
            src={image.dataUrl}
            width={WIDTH}
            height={HEIGHT}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )
    }

    const maxHeight = HEIGHT - 80
    const maxWidth = WIDTH - 160
    const scale = Math.min(maxHeight / image.height, maxWidth / image.width)
    const width = Math.round(image.width * scale)
    const height = Math.round(image.height * scale)
    return (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1F2027'
        }}
      >
        <img
          src={backdrop}
          width={WIDTH}
          height={HEIGHT}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
        <img
          src={image.dataUrl}
          width={width}
          height={height}
          style={{
            borderRadius: 6,
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)'
          }}
        />
      </div>
    )
  }

  const background = page.kind === 'site' ? page.image : undefined
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1F2027',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'black'
      }}
    >
      {background && (
        <img
          src={background.dataUrl}
          width={WIDTH}
          height={HEIGHT}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          width: 900,
          height: 465,
          display: 'flex',
          flexDirection: 'column',
          border: '16px solid rgba(0,0,0,0.3)',
          borderRadius: 8
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 40,
            backgroundColor: '#fff',
            padding: 48,
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          <div
            style={{
              fontSize: page.title.length > 20 ? 56 : 70,
              fontWeight: 700,
              fontFamily: 'Inter, Noto Sans KR, Noto Sans SC',
              lineHeight: 1.3,
              // 한글이 글자 단위로 줄바꿈되어 단어가 쪼개지지 않게 한다
              wordBreak: 'keep-all'
            }}
          >
            {page.title}
          </div>

          {page.detail && (
            <div style={{ fontSize: 32, opacity: 0.6 }}>{page.detail}</div>
          )}
        </div>
      </div>
    </div>
  )
}

async function getOgPage(
  config: ResolvedSiteConfig,
  pageId: string
): Promise<OgPage | { error: PageError }> {
  const mapImageUrl = createMapImageUrl(config)
  const recordMap = await getNotion().getPage(pageId)

  const keys = Object.keys(recordMap?.block || {})
  // v7.10부터 record 값이 `Block | { role, value }` union이다. `.value`만 꺼내면
  // 래퍼가 Block 자리에 들어가 제목과 표지를 못 찾고 사이트 이름으로 떨어진다.
  const block = getBlockValue(
    recordMap?.block?.[pageId] ?? recordMap?.block?.[keys[0]!]
  ) as PageBlock | undefined

  if (!block) {
    throw new Error('Invalid recordMap for page')
  }

  if (
    block.space_id &&
    config.rootNotionSpaceId &&
    block.space_id !== config.rootNotionSpaceId
  ) {
    return {
      error: {
        statusCode: 400,
        message: `Notion page "${pageId}" belongs to a different workspace.`
      }
    }
  }

  const author =
    getPageProperty<string>('Author', block, recordMap) || config.author
  const detail = author || config.domain

  // 메인은 사이트 자체를 소개하는 카드를 유지한다
  if (pageId === parsePageId(config.rootNotionPageId)) {
    const cover = await fetchImage(
      mapImageUrl(block.format?.page_cover ?? undefined, block) ??
        mapImageUrl(config.defaultPageCover ?? undefined, block)
    )
    return {
      kind: 'site',
      title: getBlockTitle(block, recordMap) || config.name,
      detail,
      image: cover
    }
  }

  // 본문 글은 글을 대표하는 그림을 그대로 보여 준다. 제목은 메신저가 카드 아래에
  // 따로 적어 주므로 그림 위에 다시 쓰지 않는다. 사이트 기본 표지는 글과 무관해서 쓰지 않는다.
  const candidates = [
    getPageProperty<string>('Social Image', block, recordMap),
    block.format?.page_cover,
    getFirstBodyImage(block, recordMap)
  ]
  for (const candidate of candidates) {
    const image = await fetchImage(mapImageUrl(candidate ?? undefined, block))
    if (image) {
      const isWide = image.width / image.height >= FULL_BLEED_MIN_RATIO
      return {
        kind: 'image',
        image,
        backdrop: isWide ? undefined : await makeBackdrop(image)
      }
    }
  }

  return {
    kind: 'title',
    title: getBlockTitle(block, recordMap) || config.name,
    detail
  }
}

function getFirstBodyImage(
  page: PageBlock,
  recordMap: ExtendedRecordMap
): string | undefined {
  for (const id of page.content ?? []) {
    const child = getBlockValue(recordMap.block[id]) as Block | undefined
    if (child?.type === 'image') {
      const source =
        child.format?.display_source ??
        (child.properties as { source?: string[][] } | undefined)
          ?.source?.[0]?.[0]
      if (source) {
        return source
      }
    }
  }
  return undefined
}

// satori는 img src를 직접 받으면서 User-Agent를 붙이지 않아 Notion 이미지 프록시가
// 403(HTML)을 주고, 렌더가 "Image size cannot be determined"로 500이 된다. 여기서
// UA를 붙여 받고 sharp로 JPEG로 바꿔 data URL로 넘긴다. satori가 못 읽는 WebP도
// 이 변환으로 해결되고, 1200px로 줄여 렌더 메모리도 아낀다.
async function fetchImage(
  url: string | undefined | null
): Promise<OgImage | undefined> {
  if (!url) {
    return undefined
  }

  try {
    const source = await ky
      .get(url, {
        headers: { 'user-agent': NOTION_FETCH_USER_AGENT },
        timeout: 10_000
      })
      .arrayBuffer()
    const { data, info } = await sharp(Buffer.from(source))
      .rotate()
      .resize({
        width: WIDTH,
        height: WIDTH,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
    return {
      dataUrl: `data:image/jpeg;base64,${data.toString('base64')}`,
      width: info.width,
      height: info.height
    }
  } catch {
    return undefined
  }
}

// satori는 CSS filter: blur를 제대로 그리지 못해 흐린 배경을 sharp로 미리 만든다
async function makeBackdrop(image: OgImage): Promise<string> {
  const source = Buffer.from(image.dataUrl.split(',')[1]!, 'base64')
  // sharp 파이프라인은 resize를 하나만 적용하므로 작게 줄여 흐리는 단계와 키우는 단계를 나눈다
  const small = await sharp(source)
    .resize(300, 158, { fit: 'cover' })
    .blur(6)
    .modulate({ brightness: 0.55 })
    .toBuffer()
  const blurred = await sharp(small)
    .resize(WIDTH, HEIGHT)
    .jpeg({ quality: 70 })
    .toBuffer()
  return `data:image/jpeg;base64,${blurred.toString('base64')}`
}
