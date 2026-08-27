import { type Block } from 'notion-types'
import { defaultMapImageUrl } from 'notion-utils'

import { type ResolvedSiteConfig } from './site-config-resolve'

export type MapImageUrl = (
  url: string | undefined,
  block: Block
) => string | undefined

/**
 * 설정에서 지정한 기본 아이콘/커버는 Notion 리사이저를 태우지 않고 그대로 쓴다.
 * 우리 `public/` 아래 파일이거나 외부 절대 URL이라 노션이 서명해 줄 대상이 아니다.
 *
 * react-notion-x가 `(url, block)` 모양으로 부르기 때문에 설정을 미리 묶어 둔
 * 함수를 돌려준다.
 */
export function createMapImageUrl(config: ResolvedSiteConfig): MapImageUrl {
  return (url: string | undefined, block: Block) => {
    if (url === config.defaultPageCover || url === config.defaultPageIcon) {
      return url
    }

    return defaultMapImageUrl(url, block) ?? undefined
  }
}
