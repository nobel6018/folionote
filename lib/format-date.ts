import { dateFormat } from './config'

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
]

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

/**
 * Notion date 속성을 site.config.ts의 `dateFormat`에 맞춰 문자열로 만든다.
 *
 * Notion API는 date 속성의 표시 형식을 스키마에 담아주지 않는다. 그래서
 * `notion-utils`의 formatDate는 항상 영문 로케일로 렌더하고, 한국어 사이트에서
 * "Jul 4, 2026"처럼 어긋난다. 사이트 단위 형식 문자열로 이 결정을 사용자에게 넘긴다.
 *
 * 입력은 Notion이 주는 `YYYY-MM-DD`(date) 또는 타임스탬프(ms)를 받는다.
 * 날짜만 있는 값은 UTC 자정으로 파싱되므로 로컬 타임존 보정 없이 UTC 필드를 읽는다.
 */
export function formatNotionDate(
  value: string | number,
  format: string = dateFormat
): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : ''
  }

  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()

  // 긴 토큰을 먼저 치환해야 MMMM이 MMM+M으로 쪼개지지 않는다
  return format
    .replaceAll('YYYY', String(year))
    .replaceAll('MMMM', MONTHS_LONG[month - 1]!)
    .replaceAll('MMM', MONTHS_SHORT[month - 1]!)
    .replaceAll('MM', String(month).padStart(2, '0'))
    .replaceAll('DD', String(day).padStart(2, '0'))
    .replaceAll('M', String(month))
    .replaceAll('D', String(day))
}
