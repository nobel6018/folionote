import { type PageError, type PageErrorKind } from '../types.js'

/**
 * Notion 읽기 실패를 사용자가 고칠 수 있는 종류로 가른다.
 *
 * notion-client가 던지는 것을 실측하면 셋으로 나뉜다.
 *
 * | 상황                         | 던지는 것                                        |
 * | ---------------------------- | ------------------------------------------------ |
 * | 페이지가 "웹에 게시" 안 됨   | `Error("Notion page not found <id>")`            |
 * | 그런 ID의 페이지가 없음      | `FetchError` 400, body.name = "ValidationError"  |
 * | ID 형식이 틀림               | `Error("invalid notion pageId ...")`             |
 *
 * 첫 번째가 셋업에서 가장 흔한 실패다. Notion의 "링크 공유"와 "웹에 게시"를
 * 헷갈리면 이 오류가 난다. Notion은 비공개 페이지와 삭제된 페이지를 구분해 주지
 * 않으므로 안내 문구도 둘을 함께 말한다.
 *
 * 여기서 분류된 오류는 페이지 대신 안내 화면으로 렌더된다. 특히 루트 페이지는
 * `next build` 때 미리 만들어지므로, 여기서 잡지 않으면 빌드가 실패하고 사용자는
 * Vercel 빌드 로그에서 원인을 찾아야 한다. (@see packages/core/src/server/resolve-notion-page.ts)
 */
export function classifyNotionError(err: unknown): PageError | null {
  const e = err as any
  const message = String(e?.message ?? '')
  const status: number | undefined =
    e?.statusCode ?? e?.status ?? e?.response?.status
  const bodyName: string | undefined = e?.data?.name ?? e?.response?._data?.name

  const make = (
    kind: PageErrorKind,
    statusCode: number,
    text: string
  ): PageError => ({ kind, statusCode, message: text })

  if (/Notion page not found/i.test(message)) {
    return make(
      'unpublished',
      404,
      'Notion 페이지가 공개되지 않았거나 없습니다'
    )
  }

  if (status === 400 && bodyName === 'ValidationError') {
    return make('not-found', 404, 'Notion에 그런 ID의 페이지가 없습니다')
  }

  if (/invalid notion pageId/i.test(message)) {
    return make('invalid-id', 404, 'Notion 페이지 ID 형식이 틀렸습니다')
  }

  if (status === 429) {
    return make('rate-limited', 503, 'Notion이 요청을 잠시 제한했습니다')
  }

  // 네트워크 오류, Notion 장애 등. 캐시하면 안 되는 종류라 호출자가 다시 던진다.
  return null
}
