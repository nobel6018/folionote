import { IconContext } from '@react-icons/all-files'
import Document, { Head, Html, Main, NextScript } from 'next/document'

import { customCode, language } from '@/lib/config'

// 다크모드 noflash 처리: next-themes(ThemeProvider in _app.tsx)가 자체 inject. 수동 script 불필요.
export default class MyDocument extends Document {
  override render() {
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
