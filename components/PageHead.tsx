import Head from 'next/head'

import type * as types from '@/lib/types'
import { getSocialImageUrl } from '@/lib/get-social-image-url'
import { useOptionalSiteConfig } from '@/lib/site-config-context'

/**
 * 설정 없이도 렌더돼야 한다. `/_error`는 페이지 데이터를 만들지 못한 상태라
 * `pageProps.config`가 없다. 그 경우 사이트에 딸린 태그(RSS, 트위터 계정)만 빠진다.
 */
export function PageHead({
  site,
  title,
  description,
  pageId,
  image,
  url,
  isBlogPost,
  noindex
}: Partial<types.PageProps> & {
  title?: string
  description?: string
  image?: string
  url?: string
  isBlogPost?: boolean
  /** 켜면 검색엔진에서 뺀다 (@see lib/page-meta.ts) */
  noindex?: boolean
}) {
  const config = useOptionalSiteConfig()
  const rssFeedUrl = config ? `${config.host}/feed` : null

  title = title ?? site?.name
  description = description ?? site?.description

  const socialImageUrl =
    (config ? getSocialImageUrl(config, pageId) : null) || image

  return (
    <Head>
      <meta charSet='utf-8' />
      <meta httpEquiv='Content-Type' content='text/html; charset=utf-8' />
      <meta
        name='viewport'
        content='width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover'
      />

      <meta name='mobile-web-app-capable' content='yes' />
      <meta name='apple-mobile-web-app-status-bar-style' content='black' />

      <meta
        name='theme-color'
        media='(prefers-color-scheme: light)'
        content='#fefffe'
        key='theme-color-light'
      />
      <meta
        name='theme-color'
        media='(prefers-color-scheme: dark)'
        content='#2d3439'
        key='theme-color-dark'
      />

      <meta
        name='robots'
        content={noindex ? 'noindex,nofollow' : 'index,follow'}
      />
      {/* 글은 article이어야 한다. 전부 website로 내보내고 있었다. */}
      <meta property='og:type' content={isBlogPost ? 'article' : 'website'} />

      {site && (
        <>
          <meta property='og:site_name' content={site.name} />
          <meta property='twitter:domain' content={site.domain} />
        </>
      )}

      {config?.twitter && (
        <meta name='twitter:creator' content={`@${config.twitter}`} />
      )}

      {description && (
        <>
          <meta name='description' content={description} />
          <meta property='og:description' content={description} />
          <meta name='twitter:description' content={description} />
        </>
      )}

      {socialImageUrl ? (
        <>
          <meta name='twitter:card' content='summary_large_image' />
          <meta name='twitter:image' content={socialImageUrl} />
          <meta property='og:image' content={socialImageUrl} />
        </>
      ) : (
        <meta name='twitter:card' content='summary' />
      )}

      {url && (
        <>
          <link rel='canonical' href={url} />
          <meta property='og:url' content={url} />
          <meta property='twitter:url' content={url} />
        </>
      )}

      {rssFeedUrl && (
        <link
          rel='alternate'
          type='application/rss+xml'
          href={rssFeedUrl}
          title={site?.name}
        />
      )}

      <meta property='og:title' content={title} />
      <meta name='twitter:title' content={title} />
      <title>{title}</title>

      {/* Better SEO for the blog posts */}
      {isBlogPost && (
        <script type='application/ld+json'>
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            '@id': `${url}#BlogPosting`,
            mainEntityOfPage: url,
            url,
            headline: title,
            name: title,
            description,
            author: {
              '@type': 'Person',
              name: config?.author
            },
            image: socialImageUrl
          })}
        </script>
      )}
    </Head>
  )
}
