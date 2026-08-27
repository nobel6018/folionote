import Redis from 'ioredis'

import { type ResolvedSiteConfig } from '../config/site-config-resolve.js'
import { getRedisSettings } from './server-env.js'

/**
 * 페이지뷰 카운터 저장소 (레퍼런스 서비스 어드민의 "페이지뷰 카운트").
 *
 * Keyv를 쓰지 않고 ioredis를 직접 쓴다. Keyv에는 원자적 증가가 없어서
 * get → set으로 흉내내면 동시 요청이 서로의 값을 덮어쓴다.
 *
 * Redis 없이는 동작할 수 없다. 서버리스에서 인메모리 카운터는 인스턴스마다
 * 따로 세고 재시작마다 사라져서 숫자가 의미를 잃는다. 그래서 이 기능은
 * `isRedisEnabled`와 함께만 켜진다.
 */

let client: Redis | null = null

export function isPageViewCountAvailable(config: ResolvedSiteConfig): boolean {
  return config.pageViewCount.enabled && config.isRedisEnabled
}

function getClient(config: ResolvedSiteConfig): Redis | null {
  if (!isPageViewCountAvailable(config)) {
    return null
  }

  const { url } = getRedisSettings(config.isRedisEnabled)
  if (!url) {
    return null
  }

  client ??= new Redis(url, {
    // 카운터는 부가 기능이다. 오래 매달리지 않고 실패하면 조용히 포기한다
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
    commandTimeout: 3000,
    // offline queue를 끄면 연결이 맺어지기 전에 들어온 명령이 곧바로 거절된다.
    // 서버리스는 요청마다 콜드 스타트가 날 수 있어서 그러면 첫 방문이 계속
    // 유실된다. 큐에 담아 두고 commandTimeout으로 끊는 편이 맞다.
    enableOfflineQueue: true
  })

  return client
}

/**
 * 카운터를 묶을 "오늘" 날짜 키.
 *
 * 타임존을 설정에서 받는다. UTC로 고정하면 한국 사이트에서 오전 9시에 날짜가
 * 바뀌어 운영자가 보는 "Today"와 어긋난다.
 */
function todayKey(config: ResolvedSiteConfig): string {
  // en-CA 로케일이 YYYY-MM-DD를 준다
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.pageViewCount.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

const TOTAL_PREFIX = 'folio:pv:total:'
const DAILY_PREFIX = 'folio:pv:daily:'
/** 일자별 키는 8일 뒤 버린다. 표시에는 오늘 값만 쓴다 */
const DAILY_TTL_SECONDS = 8 * 24 * 60 * 60

export type PageViewCounts = { today: number; total: number }

export async function incrementPageView(
  config: ResolvedSiteConfig,
  pageId: string
): Promise<PageViewCounts | null> {
  const redis = getClient(config)
  if (!redis) return null

  const dailyKey = `${DAILY_PREFIX}${pageId}:${todayKey(config)}`

  try {
    const [today, total] = (await redis
      .multi()
      .incr(dailyKey)
      .expire(dailyKey, DAILY_TTL_SECONDS)
      .incr(`${TOTAL_PREFIX}${pageId}`)
      .exec()
      .then((results) => [results?.[0]?.[1], results?.[2]?.[1]])) as [
      number,
      number
    ]

    return { today: Number(today) || 0, total: Number(total) || 0 }
  } catch {
    return null
  }
}

export async function readPageView(
  config: ResolvedSiteConfig,
  pageId: string
): Promise<PageViewCounts | null> {
  const redis = getClient(config)
  if (!redis) return null

  try {
    const [today, total] = await redis.mget(
      `${DAILY_PREFIX}${pageId}:${todayKey(config)}`,
      `${TOTAL_PREFIX}${pageId}`
    )

    return { today: Number(today) || 0, total: Number(total) || 0 }
  } catch {
    return null
  }
}
