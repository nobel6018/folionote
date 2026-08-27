import { ErrorPage } from '@/components/ErrorPage'
import { loadSiteConfig } from '@/lib/load-site-config'
import { type ResolvedSiteConfig } from '@/lib/site-config-resolve'

/**
 * 500 화면도 폰트와 테마를 사이트 설정에서 받는다. 이 파일이 없으면 Next가
 * `_error`로 정적 500 페이지를 만드는데, 그 경로에는 설정을 실을 방법이 없다.
 */
export function getStaticProps() {
  return {
    props: { config: loadSiteConfig() }
  }
}

export default function ServerErrorPage(_props: {
  config: ResolvedSiteConfig
}) {
  return <ErrorPage statusCode={500} />
}
