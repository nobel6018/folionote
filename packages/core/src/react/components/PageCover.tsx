import { type ExtendedRecordMap, type PageBlock } from 'notion-types'
import { getBlockTitle, normalizeUrl } from 'notion-utils'
import * as React from 'react'

import { type MapImageUrl } from '../../shared/map-image-url.js'
import { isResizableRemoteImage, remoteImageLoader } from './NotionImage.js'

/** next/image 기본 `deviceSizes`와 같은 후보 폭 */
const COVER_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840]

/**
 * 상세 페이지 상단 커버. react-notion-x 기본 커버를 대신 그린다.
 *
 * react-notion-x는 프리뷰 이미지가 없는 커버를 `loading="lazy"`인 일반 `<img>`로
 * 그리고, 이 속성은 밖에서 덮을 수 없다. 커버는 대개 첫 화면에서 가장 큰 요소(LCP)라
 * 지연 로딩이 오히려 늦춘다. note.leedo.me 홈은 커버 851KB를 lazy로 받아 모바일
 * LCP가 15.6s였다(2026-11-14 Lighthouse). 그래서 직접 그리며 세 가지를 바꾼다.
 *
 * - `loading="eager"`, `fetchPriority="high"`로 가장 먼저 받는다
 * - 원본 서버가 리사이즈해 주는 주소면 화면 폭 기준 srcset을 붙인다 (@see NotionImage)
 * - 프리뷰 블러가 있으면 배경으로 깔아 next/image 경로의 모습을 유지한다
 *
 * DOM과 클래스는 react-notion-x와 같게 둔다. 커버 CSS가 그 클래스에 걸려 있다
 * (@see styles/folio-overrides.css 의 .notion-page-cover-wrapper)
 */
export function PageCover({
  block,
  recordMap,
  mapImageUrl,
  defaultPageCover,
  defaultPageCoverPosition
}: {
  block: PageBlock
  recordMap: ExtendedRecordMap
  mapImageUrl: MapImageUrl
  defaultPageCover: string | undefined
  defaultPageCoverPosition: number
}) {
  const {
    page_cover = defaultPageCover,
    page_cover_position = defaultPageCoverPosition
  } = block.format || {}

  const src = mapImageUrl(page_cover, block)
  if (!src) {
    return null
  }

  // react-notion-x와 같은 계산. 0을 0.5로 보는 것까지 맞춘다
  const coverPosition = (1 - (page_cover_position || 0.5)) * 100
  // react-notion-x LazyImage와 같은 순서로 찾는다
  const previewImage =
    recordMap.preview_images?.[src] ??
    recordMap.preview_images?.[normalizeUrl(src)]

  const srcSet = isResizableRemoteImage(src)
    ? COVER_WIDTHS.map(
        (width) => `${remoteImageLoader({ src, width })} ${width}w`
      ).join(', ')
    : undefined

  return (
    <div className='notion-page-cover-wrapper'>
      <img
        className='notion-page-cover'
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? '100vw' : undefined}
        alt={getBlockTitle(block, recordMap)}
        loading='eager'
        fetchPriority='high'
        decoding='async'
        style={{
          objectPosition: `center ${coverPosition}%`,
          ...(previewImage && {
            backgroundImage: `url("${previewImage.dataURIBase64}")`,
            backgroundSize: 'cover',
            backgroundPosition: `center ${coverPosition}%`
          })
        }}
      />
    </div>
  )
}
