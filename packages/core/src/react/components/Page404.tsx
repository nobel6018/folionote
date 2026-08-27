import type * as types from '../../types.js'
import { useSiteConfig } from '../site-config-context.js'
import { PageHead } from './PageHead.js'
import styles from './styles.module.css'

const ko = {
  title: '페이지를 찾을 수 없습니다',
  ownerHint: '이 사이트를 만든 분이라면 아래를 확인하세요.',
  openInNotion: 'Notion에서 이 페이지 열기',
  unpublished: {
    heading: 'Notion 페이지가 공개되지 않았습니다',
    body: 'Notion은 비공개 페이지와 삭제된 페이지를 구분해 주지 않습니다. 페이지가 있다면 공개 설정을 확인하세요.',
    steps: [
      'Notion에서 페이지를 열고 우상단 공유 버튼을 누릅니다',
      '게시 탭에서 웹에 게시를 켭니다. 링크 공유와 다릅니다',
      '저장하면 이 화면은 30초 안에 사이트로 바뀝니다'
    ]
  },
  notFound: {
    heading: 'Notion에 이 ID의 페이지가 없습니다',
    body: 'rootNotionPageId 또는 주소의 페이지 ID가 틀렸습니다. Notion 페이지 주소 끝의 32자리 값을 다시 복사해 넣으세요.',
    steps: []
  },
  invalidId: {
    heading: 'Notion 페이지 ID 형식이 틀렸습니다',
    body: '페이지 ID는 32자리 16진수 문자열입니다. Notion 페이지 주소를 통째로 넣어도 됩니다.',
    steps: []
  },
  rateLimited: {
    heading: 'Notion이 요청을 잠시 제한했습니다',
    body: '짧은 시간에 너무 많이 읽었습니다. 잠시 뒤 새로고침하면 됩니다.',
    steps: []
  },
  generic: {
    heading: '페이지를 찾을 수 없습니다',
    body: '주소가 맞는지 확인하세요.',
    steps: []
  }
}

const en: typeof ko = {
  title: 'Page not found',
  ownerHint: 'If you own this site, check the following.',
  openInNotion: 'Open this page in Notion',
  unpublished: {
    heading: 'This Notion page is not published',
    body: 'Notion does not distinguish a private page from a deleted one. If the page exists, check its publish setting.',
    steps: [
      'Open the page in Notion and click Share at the top right',
      'In the Publish tab, turn on Publish to web. This is different from link sharing',
      'Once saved, this screen turns into your site within 30 seconds'
    ]
  },
  notFound: {
    heading: 'No Notion page has this ID',
    body: 'rootNotionPageId or the page ID in the URL is wrong. Copy the 32-character value at the end of the Notion page URL again.',
    steps: []
  },
  invalidId: {
    heading: 'The Notion page ID is malformed',
    body: 'A page ID is a 32-character hex string. Pasting the whole Notion page URL also works.',
    steps: []
  },
  rateLimited: {
    heading: 'Notion is rate limiting requests',
    body: 'Too many reads in a short time. Refresh in a moment.',
    steps: []
  },
  generic: {
    heading: 'Page not found',
    body: 'Check that the address is correct.',
    steps: []
  }
}

function pickCopy(language: string, error?: types.PageError) {
  const t = language?.startsWith('ko') ? ko : en
  switch (error?.kind) {
    case 'unpublished':
      return { t, c: t.unpublished }
    case 'not-found':
      return { t, c: t.notFound }
    case 'invalid-id':
      return { t, c: t.invalidId }
    case 'rate-limited':
      return { t, c: t.rateLimited }
    default:
      return { t, c: t.generic }
  }
}

/**
 * 404와 "사용자가 고칠 수 있는 실패"의 안내 화면.
 *
 * 셋업에서 가장 흔한 실패는 Notion 페이지를 "웹에 게시"하지 않은 것이다. 이 화면이
 * 그 사실과 고치는 순서를 직접 말해준다. README에 적는 것보다 낫다. 막힌 사람은
 * README가 아니라 이 화면을 보고 있다. (@see packages/core/src/shared/notion-errors.ts)
 *
 * 루트 페이지가 이 상태면 사이트 주인의 셋업 문제이므로 안내를 크게 보여주고,
 * 하위 페이지면 방문자가 볼 수도 있으니 짧게 둔다. 어느 쪽이든 검색엔진에는
 * 올리지 않는다. 임시 상태를 "없는 페이지"로 색인하면 안 된다.
 */
export function Page404({ site, pageId, error }: Partial<types.PageProps>) {
  const config = useSiteConfig()
  const { t, c } = pickCopy(config.language, error)
  const isRoot =
    !!pageId &&
    !!site?.rootNotionPageId &&
    pageId.replaceAll('-', '') === site.rootNotionPageId.replaceAll('-', '')
  const showHelp = !!error?.kind
  const notionUrl = pageId
    ? `https://www.notion.so/${pageId.replaceAll('-', '')}`
    : null

  return (
    <>
      <PageHead site={site} title={site?.name || t.title} noindex={true} />

      <div className={styles.container}>
        <main className={styles.main}>
          <h1>{c.heading}</h1>

          {showHelp ? (
            <div className={styles.errorHelp}>
              {isRoot && <p className={styles.errorOwnerHint}>{t.ownerHint}</p>}
              <p>{c.body}</p>
              {c.steps.length > 0 && (
                <ol>
                  {c.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              )}
              {notionUrl && (
                <p>
                  <a href={notionUrl} target='_blank' rel='noreferrer'>
                    {t.openInNotion}
                  </a>
                  <code className={styles.errorPageId}>{pageId}</code>
                </p>
              )}
            </div>
          ) : (
            <p>{error?.message || c.body}</p>
          )}

          <img
            src='/404.png'
            alt='404 Not Found'
            className={styles.errorImage}
          />
        </main>
      </div>
    </>
  )
}
