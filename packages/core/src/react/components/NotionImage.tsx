import Image, { type ImageLoader, type ImageProps } from 'next/image'
import * as React from 'react'

const NOTION_IMAGE_PREFIX = 'https://www.notion.so/image/'
const UNSPLASH_PREFIX = 'https://images.unsplash.com/'

/**
 * 원본 서버에 리사이즈를 시켜 Vercel 이미지 변환을 건너뛴다.
 *
 * 이미지를 만지는 코드가 아니라 주소를 만드는 코드다. 우리 쪽 CPU도 대역폭도
 * 들지 않는다. `unoptimized`와 달리 srcset은 그대로 살아 있다. Next는
 * unoptimized면 srcSet/sizes를 undefined로 두고 로더를 아예 호출하지 않지만
 * (next/dist/shared/lib/get-img-props.js의 generateImgAttrs), 커스텀 로더면
 * 폭마다 로더를 불러 srcset을 엮는다.
 *
 * 개념은 하나인데 호스트마다 계약이 달라 분기한다. 노션은 `width`, unsplash를
 * 굴리는 imgix는 `w`다. 둘 다 실측으로 확인했다.
 *
 * - 노션: `width=400`에서 22,270B, 원본 38,938B. 포맷은 Accept에 webp가 있으면
 *   webp, 없으면 원본. avif는 모른다(avif만 제시하면 jpeg로 떨어진다).
 * - unsplash: `w=400`에서 29,128B, 원본 2,803,774B. `auto=format`을 붙이면
 *   avif까지 협상한다(w=800에서 avif 47,727B / webp 75,352B / jpeg 81,924B).
 *
 * 파라미터가 무시되더라도 원본을 그대로 받을 뿐 이미지가 깨지진 않는다. 조용히
 * 커지는 쪽이라, 용량이 늘면 여기부터 의심할 것.
 */
export const remoteImageLoader: ImageLoader = ({ src, width, quality }) => {
  if (src.startsWith(NOTION_IMAGE_PREFIX)) {
    // 노션 주소는 이미 table·id·cache 쿼리를 달고 있으므로 이어 붙인다
    return `${src}&width=${width}`
  }

  if (src.startsWith(UNSPLASH_PREFIX)) {
    const url = new URL(src)
    url.searchParams.set('w', String(width))
    url.searchParams.set('auto', 'format')
    // 노션이 넘겨주는 커버 주소에는 `q=85`가 이미 붙어 있다. next/image 쪽에서
    // 값을 주지 않으면 그대로 두고, 줄 때만 덮는다.
    if (quality) {
      url.searchParams.set('q', String(quality))
    }
    return url.toString()
  }

  return src
}

/**
 * 카드 커버를 imgix(unsplash)에서 카드 비율로 잘라 받는 로더를 만든다.
 *
 * 카드는 `--folio-card-cover-aspect`(16:9)로 `object-fit: cover`를 걸어 이미지를
 * 잘라 보여준다. 폭만 줄이면 잘려 나갈 부분까지 다 받는다. 세로 사진(4016x6016)은
 * `w=750`에서 750x1125를 받아 452KB였고, 16:9로 잘라 받으면 158KB였다
 * (note.leedo.me 홈, 2026-11-16). 가로 사진도 12~15% 준다.
 *
 * 남는 부분이 화면과 같도록 Notion의 커버 위치(`object-position`의 세로 %)를 imgix
 * 초점(`fp-y`)으로 넘긴다. 노션 이미지 서버는 자르기를 지원하지 않아 그대로 둔다.
 * CSS 토큰의 비율을 바꾸면 `CARD_COVER_ASPECT`도 바꾼다. 어긋나도 `object-fit: cover`가
 * 다시 잘라 주므로 깨지지는 않는다.
 */
const CARD_COVER_ASPECT = 16 / 9

function createCardCoverLoader(focalY: number): ImageLoader {
  return ({ src, width, quality }) => {
    const url = new URL(remoteImageLoader({ src, width, quality }))
    url.searchParams.set('h', String(Math.round(width / CARD_COVER_ASPECT)))
    url.searchParams.set('fit', 'crop')
    url.searchParams.set('crop', 'focalpoint')
    url.searchParams.set('fp-x', '0.5')
    url.searchParams.set('fp-y', String(focalY))
    return url.toString()
  }
}

/** `object-position`의 세로 값(`center 30%`)을 0~1로. 없거나 읽지 못하면 가운데 */
function getFocalY(style: React.CSSProperties | undefined): number {
  const match = String(style?.objectPosition ?? '').match(/(-?[\d.]+)%\s*$/)
  const percent = match ? Number(match[1]) : 50
  return Math.min(1, Math.max(0, percent / 100))
}

export function isResizableRemoteImage(src: ImageProps['src']): src is string {
  return (
    typeof src === 'string' &&
    (src.startsWith(NOTION_IMAGE_PREFIX) || src.startsWith(UNSPLASH_PREFIX))
  )
}

/**
 * 이미지가 화면에 그려지는 폭. 브라우저는 이 값에 기기 픽셀 비율을 곱해 srcset에서
 * 고른다. 값은 CSS 토큰과 맞춘다.
 *
 * - 카드: 708px 본문에 `--folio-card-min-width`(260px) 카드 2열이라 한 장이 346px.
 *   폭이 좁아 1열로 떨어지면 화면 폭을 다 쓴다
 * - 본문: `--folio-content-max-width`(708px)
 * - 상세 페이지 커버: 화면 폭 전체
 *
 * react-notion-x는 원본 크기(`width=4016`)만 넘기고 `sizes`를 주지 않는다. 그러면
 * next/image가 1x/2x 후보를 원본 폭 기준으로 잡아 둘 다 `w=3840`이 된다. 갤러리 카드
 * 한 장이 7.7MB까지 나왔다(note.leedo.me 홈, 2026-11-13 Lighthouse).
 */
const CARD_IMAGE_SIZES = '(max-width: 600px) 100vw, 346px'
const BODY_IMAGE_SIZES = '(max-width: 740px) 100vw, 708px'
const PAGE_COVER_IMAGE_SIZES = '100vw'

/**
 * 컬렉션 카드 안의 이미지인지. react-notion-x가 카드 커버와 본문 이미지에 넘기는
 * prop이 구분되지 않아서, 컬렉션 래퍼가 이 컨텍스트로 알려 준다
 * (@see folio/Collection.tsx)
 */
export const CollectionImageContext = React.createContext(false)

function getImageSizes({
  className,
  isInCollection
}: {
  className: ImageProps['className']
  isInCollection: boolean
}): string {
  if (isInCollection) {
    return CARD_IMAGE_SIZES
  }

  if (className?.split(' ').includes('notion-page-cover')) {
    return PAGE_COVER_IMAGE_SIZES
  }

  return BODY_IMAGE_SIZES
}

/**
 * react-notion-x에 넘기는 `nextImage`. 원본 서버가 리사이즈를 해주는 이미지에만
 * 위 로더와 `sizes`를 물린다.
 *
 * 전역 `images.loaderFile`로 걸면 로고 같은 로컬 이미지까지 같은 로더를 타서
 * 최적화가 통째로 꺼진다. 그래서 이미지 단위로 `loader` prop을 준다.
 * `loader`가 undefined면 next/image가 기본 로더(Vercel 최적화)를 쓴다.
 */
export function NotionImage({
  src,
  sizes,
  className,
  style,
  ...rest
}: ImageProps) {
  const isInCollection = React.useContext(CollectionImageContext)

  if (!isResizableRemoteImage(src)) {
    return (
      <Image
        {...rest}
        src={src}
        sizes={sizes}
        className={className}
        style={style}
      />
    )
  }

  // 카드 커버를 꽉 채워 자르는 경우만. "이미지 맞춤(contain)"은 원본 비율 그대로 보여 준다
  const isCroppedCardCover =
    isInCollection &&
    src.startsWith(UNSPLASH_PREFIX) &&
    style?.objectFit === 'cover'

  return (
    <Image
      {...rest}
      src={src}
      className={className}
      style={style}
      sizes={sizes ?? getImageSizes({ className, isInCollection })}
      loader={
        isCroppedCardCover
          ? createCardCoverLoader(getFocalY(style))
          : remoteImageLoader
      }
    />
  )
}
