import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  // eslint-disable-next-line no-process-env
  enabled: process.env.ANALYZE === 'true'
})

export default withBundleAnalyzer({
  staticPageGenerationTimeout: 300,
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
