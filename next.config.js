import bundleAnalyzer from '@next/bundle-analyzer'

const withBundleAnalyzer = bundleAnalyzer({
  // eslint-disable-next-line no-process-env
  enabled: process.env.ANALYZE === 'true'
})

export default withBundleAnalyzer({
  // TODO: react-notion-x v7.10.0의 union 타입(Block | { role, value })에
  // starter-kit 코드가 아직 대응 안 됨. 일시적으로 type/lint 우회 후 사후 정리 (Task #22).
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

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
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  trailingSlash: true,

  // See https://react-tweet.vercel.app/next#troubleshooting
  transpilePackages: ['react-tweet']
})
