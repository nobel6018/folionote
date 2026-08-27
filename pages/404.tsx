import { Page404 } from '@/components/Page404'
import { loadSiteConfig } from '@/lib/load-site-config'
import { type PageProps } from '@/lib/types'

/**
 * 404 화면도 사이트 설정이 필요하다(언어, 폰트, 테마). Next는 이 페이지에
 * `getStaticProps`를 허용하므로 빌드 시점에 설정을 실어 둔다.
 */
export function getStaticProps() {
  const config = loadSiteConfig()

  // site는 넘기지 않는다. Page404가 site.name이 있으면 그걸 제목으로 쓰는데,
  // 없는 페이지의 제목은 사이트 이름이 아니라 "페이지를 찾을 수 없습니다"여야 한다.
  return {
    props: { config }
  }
}

export default function NotFoundPage(props: PageProps) {
  return <Page404 {...props} />
}
