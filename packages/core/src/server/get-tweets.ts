import { type ExtendedRecordMap } from 'notion-types'
import { getPageTweetIds } from 'notion-utils'
import pMap from 'p-map'
import pMemoize from 'p-memoize'
import { getTweet as getTweetData } from 'react-tweet/api'

import type { ExtendedTweetRecordMap } from '../types.js'
import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'
import { getDb } from './db.js'
import { type CoreDeps } from './deps.js'

export async function getTweetsMap(
  config: ResolvedSiteConfig,
  recordMap: ExtendedRecordMap,
  deps?: CoreDeps
): Promise<void> {
  const tweetIds = getPageTweetIds(recordMap)

  const tweetsMap = Object.fromEntries(
    await pMap(
      tweetIds,
      async (tweetId: string) => {
        return [tweetId, await getTweet(config, tweetId, deps)]
      },
      {
        concurrency: 8
      }
    )
  )

  ;(recordMap as ExtendedTweetRecordMap).tweets = tweetsMap
}

async function getTweetImpl(
  config: ResolvedSiteConfig,
  tweetId: string,
  deps?: CoreDeps
): Promise<any> {
  if (!tweetId) return null

  const db = getDb(config, deps)
  const cacheKey = `tweet:${tweetId}`

  try {
    try {
      const cachedTweet = await db.get(cacheKey)
      if (cachedTweet || cachedTweet === null) {
        return cachedTweet
      }
    } catch (err: any) {
      // ignore redis errors
      console.warn(`redis error get "${cacheKey}"`, err.message)
    }

    const tweetData = (await getTweetData(tweetId)) || null

    try {
      await db.set(cacheKey, tweetData)
    } catch (err: any) {
      // ignore redis errors
      console.warn(`redis error set "${cacheKey}"`, err.message)
    }

    return tweetData
  } catch (err: any) {
    console.warn('failed to get tweet', tweetId, err.message)
    return null
  }
}

/** 트윗은 사이트와 무관하지만 캐시 저장소는 설정마다 다르다 */
export const getTweet = pMemoize(getTweetImpl, {
  cacheKey: ([config, tweetId]) => `${config.isRedisEnabled}:${tweetId}`
})
