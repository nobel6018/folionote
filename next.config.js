import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  // eslint-disable-next-line no-process-env
  enabled: process.env.ANALYZE === 'true'
})

/* eslint-disable no-process-env */
const {
  NOTION_ROOT_PAGE_ID,
  SITE_NAME,
  SITE_AUTHOR,
  SITE_DOMAIN,
  VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL
} = process.env
/* eslint-enable no-process-env */

export default withBundleAnalyzer({
  staticPageGenerationTimeout: 300,

  // site.config.ts 대신 환경변수로 사이트 설정을 받는 경로 (@see lib/config.ts).
  //
  // 이 값들은 브라우저에서도 필요하다. 사이트 이름과 도메인은 헤더와 canonical URL을
  // 그리는 코드를 타고 클라이언트 번들까지 들어간다. Next는 NEXT_PUBLIC_ 접두사가
  // 붙은 변수만 자동으로 내보내므로, 접두사 없는 이름을 쓰려면 여기 적어야 한다.
  // 빌드 시점에 문자열로 박히니 값을 바꾸면 재배포가 필요하다.
  env: {
    NOTION_ROOT_PAGE_ID: NOTION_ROOT_PAGE_ID ?? '',
    SITE_NAME: SITE_NAME ?? '',
    SITE_AUTHOR: SITE_AUTHOR ?? '',
    // 도메인은 배포가 끝나야 정해져서 미리 물어볼 수가 없다. Vercel이 주입하는
    // 호스트명을 대신 쓴다. PRODUCTION_URL은 프로덕션 도메인으로 고정이고,
    // VERCEL_URL은 배포마다 달라지는 프리뷰 주소다. 둘 다 프로토콜이 없는
    // 호스트명이라 그대로 넣는다.
    //
    // VERCEL_URL을 그 이름으로 내보내지 않고 여기서 접는 이유가 있다. 그 이름이
    // 브라우저에 박히면 lib/config.ts의 apiHost가 클라이언트에서도 배포별 주소를
    // 가리켜, 커스텀 도메인으로 들어온 방문자가 다른 오리진으로 API를 부른다.
    SITE_DOMAIN:
      SITE_DOMAIN || VERCEL_PROJECT_PRODUCTION_URL || VERCEL_URL || ''
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.notion.so' },
      { protocol: 'https', hostname: 'notion.so' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'abs.twimg.com' },
      { protocol: 'https', hostname: 'pbs.twimg.com' },
      { protocol: 'https', hostname: 's3.us-west-2.amazonaws.com' },
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com'
      }
    ],
    formats: ['image/avif', 'image/webp'],
    // 첫 요청에서만 변환이 일어나고 그 뒤엔 캐시에서 나간다. 기본 TTL이 짧으면
    // 방문자마다 콜드 변환을 다시 겪어 카드가 늦게 뜬다. Notion 이미지는
    // 내용이 바뀌면 URL도 바뀌므로 길게 잡아도 낡은 이미지가 남지 않는다.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  trailingSlash: true,

  // RSS는 pages/feed.tsx가 그리므로 실제 경로가 /feed/ 하나뿐이다. 그런데 관행상
  // /feed.xml과 /rss.xml을 먼저 찾는 리더가 많고, 그 경로가 [pageId] 라우트에
  // 잡혀서 HTML 페이지를 200으로 돌려주고 있었다(피드가 아닌데 성공으로 보인다).
  // 같은 핸들러로 넘긴다.
  async rewrites() {
    return [
      { source: '/feed.xml', destination: '/feed' },
      { source: '/rss.xml', destination: '/feed' }
    ]
  },

  // See https://react-tweet.vercel.app/next#troubleshooting
  transpilePackages: ['react-tweet']
})
