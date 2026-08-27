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

function isResizableRemoteImage(src: ImageProps['src']): src is string {
  return (
    typeof src === 'string' &&
    (src.startsWith(NOTION_IMAGE_PREFIX) || src.startsWith(UNSPLASH_PREFIX))
  )
}

/**
 * react-notion-x에 넘기는 `nextImage`. 원본 서버가 리사이즈를 해주는 이미지에만
 * 위 로더를 물린다.
 *
 * 전역 `images.loaderFile`로 걸면 로고 같은 로컬 이미지까지 같은 로더를 타서
 * 최적화가 통째로 꺼진다. 그래서 이미지 단위로 `loader` prop을 준다.
 * `loader`가 undefined면 next/image가 기본 로더(Vercel 최적화)를 쓴다.
 */
export function NotionImage({ src, ...rest }: ImageProps) {
  return (
    <Image
      {...rest}
      src={src}
      loader={isResizableRemoteImage(src) ? remoteImageLoader : undefined}
    />
  )
}
