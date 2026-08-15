import Image, { type ImageLoader, type ImageProps } from 'next/image'
import * as React from 'react'

const NOTION_IMAGE_PREFIX = 'https://www.notion.so/image/'

/**
 * 노션 이미지 엔드포인트에 폭을 넘긴다.
 *
 * `www.notion.so/image/<원본>?table=block&id=...&cache=v2`에 `width`를 붙이면
 * 리다이렉트 대상이 `img.notionusercontent.com/.../size/w=<폭>`으로 바뀐다.
 * 즉 리사이즈를 노션이 대신 해준다. 실측으로 확인한 동작이다(폭 400에서 22,270B,
 * 원본 38,938B).
 *
 * 이미지를 만지는 코드가 아니라 주소를 만드는 코드다. 우리 쪽 CPU도 대역폭도
 * 들지 않고, Vercel 이미지 변환도 일어나지 않는다. 대신 avif는 못 쓴다.
 * 노션은 Accept에 webp가 있으면 webp, 없으면 원본 포맷을 준다(avif는 모른다).
 *
 * 노션이 `width`를 무시하게 되더라도 원본을 그대로 돌려줄 뿐이라 이미지가 깨지진
 * 않는다. 조용히 커질 뿐이므로 용량이 늘면 이 함수부터 의심할 것.
 */
export const notionImageLoader: ImageLoader = ({ src, width }) => {
  if (!src.startsWith(NOTION_IMAGE_PREFIX)) {
    return src
  }

  return `${src}&width=${width}`
}

/**
 * react-notion-x에 넘기는 `nextImage`. 노션 이미지에만 위 로더를 물린다.
 *
 * 전역 `images.loaderFile`로 걸면 로고 같은 로컬 이미지까지 같은 로더를 타서
 * 최적화가 통째로 꺼진다. 그래서 이미지 단위로 `loader` prop을 준다.
 * `loader`가 undefined면 next/image가 기본 로더(Vercel 최적화)를 쓴다.
 */
export function NotionImage({ src, ...rest }: ImageProps) {
  const isNotionImage =
    typeof src === 'string' && src.startsWith(NOTION_IMAGE_PREFIX)

  return (
    <Image
      {...rest}
      src={src}
      loader={isNotionImage ? notionImageLoader : undefined}
    />
  )
}
