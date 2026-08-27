import type { PageProps } from '@/lib/types'
import { NotionPage } from '@/components/NotionPage'
import { domain } from '@/lib/config'
import { resolveNotionPage } from '@/lib/resolve-notion-page'

export const getStaticProps = async () => {
  try {
    const props = await resolveNotionPage(domain)

    return {
      props,
      // ISR: 10분마다 backend 재검증 (메인 페이지의 collection list 갱신).
      // 안내 화면(Notion 미공개 등)은 30초로 줄인다. 사용자가 Notion에서
      // 고치면 곧바로 살아나야 한다. (@see lib/resolve-notion-page.ts)
      revalidate: props.error ? 30 : 600
    }
  } catch (err) {
    console.error('page error', domain, err)

    // we don't want to publish the error version of this page, so
    // let next.js know explicitly that incremental SSG failed
    throw err
  }
}

export default function NotionDomainPage(props: PageProps) {
  return <NotionPage {...props} />
}
