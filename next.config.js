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

  // See https://react-tweet.vercel.app/next#troubleshooting
  transpilePackages: ['react-tweet']
})
