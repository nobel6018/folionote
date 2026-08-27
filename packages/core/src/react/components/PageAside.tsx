import { type Block, type ExtendedRecordMap } from 'notion-types'

import { getPageTweet } from '../../shared/get-page-tweet.js'
import { PageActions } from './PageActions.js'
import { PageSocial } from './PageSocial.js'

export function PageAside({
  block,
  recordMap,
  isBlogPost
}: {
  block: Block
  recordMap: ExtendedRecordMap
  isBlogPost: boolean
}) {
  if (!block) {
    return null
  }

  // only display comments and page actions on blog post pages
  if (isBlogPost) {
    const tweet = getPageTweet(block, recordMap)
    if (!tweet) {
      return null
    }

    return <PageActions tweet={tweet} />
  }

  return <PageSocial />
}
