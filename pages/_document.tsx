import { IconContext } from '@react-icons/all-files'
import Document, { Head, Html, Main, NextScript } from 'next/document'

import { loadSiteConfig } from '@/lib/load-site-config'
import { type ResolvedSiteConfig } from '@/lib/site-config-resolve'

/**
 * 설정을 어디서 읽을지.
 *
 * 페이지가 실어 보낸 `pageProps.config`를 먼저 본다. 호스팅 서비스가 한 프로세스로
 * 사이트 여러 개를 그릴 때는 요청마다 이 값이 달라야 한다. `/_error`처럼 페이지
 * 데이터를 못 만든 경로에서만 이 리포에 담긴 설정으로 내려간다. `_document`는
 * 서버에서만 도므로 여기서 파일을 읽어도 브라우저 번들에는 들어가지 않는다.
 *
 * @see docs/architecture.md
 */
function readConfig(nextData: any): ResolvedSiteConfig {
  return (
    (nextData?.props?.pageProps?.config as ResolvedSiteConfig) ??
    loadSiteConfig()
  )
}

// 다크모드 noflash 처리: next-themes(ThemeProvider in _app.tsx)가 자체 inject. 수동 script 불필요.
export default class MyDocument extends Document {
  override render() {
    const { language, customCode } = readConfig(this.props.__NEXT_DATA__)

    return (
      <IconContext.Provider value={{ style: { verticalAlign: 'middle' } }}>
        {/* 사이트 언어를 따른다. 'en'이 박혀 있어서 한국어 사이트인데도 en으로
            나갔다. 스크린리더 발음과 검색엔진 언어 판정에 쓰이는 값이다. */}
        <Html lang={language} suppressHydrationWarning>
          <Head>
            <link rel='shortcut icon' href='/favicon.ico' />
            <link
              rel='icon'
              type='image/png'
              sizes='32x32'
              href='favicon.png'
            />

            <link rel='manifest' href='/manifest.json' />

            {/* 검색엔진 인증 등 사용자 메타 태그 (@see docs/custom-code.md) */}
            {customCode.metaTags?.map((tag, index) => (
              <meta
                key={`custom-meta-${index}`}
                {...(tag.name ? { name: tag.name } : {})}
                {...(tag.property ? { property: tag.property } : {})}
                content={tag.content}
              />
            ))}
          </Head>

          <body>
            {/* 사용자 코드는 서버에서 그대로 렌더한다. 브라우저가 문서로 파싱하므로
                안에 있는 <script>가 정상 실행된다. 클라이언트에서 innerHTML로
                넣으면 스크립트가 실행되지 않아 분석 도구가 조용히 죽는다. */}
            {customCode.bodyStart && (
              <div
                data-folionote-custom='body-start'
                dangerouslySetInnerHTML={{ __html: customCode.bodyStart }}
              />
            )}

            <Main />
            <NextScript />

            {customCode.bodyEnd && (
              <div
                data-folionote-custom='body-end'
                dangerouslySetInnerHTML={{ __html: customCode.bodyEnd }}
              />
            )}

            {/* CSS는 문서 맨 끝에 둔다. head에 넣으면 Next가 뒤에 붙이는 CSS
                청크에 밀려서, 같은 특이도일 때 사용자 규칙이 지고 만다. */}
            {customCode.css && (
              <style
                data-folionote-custom='css'
                dangerouslySetInnerHTML={{ __html: customCode.css }}
              />
            )}
          </body>
        </Html>
      </IconContext.Provider>
    )
  }
}
