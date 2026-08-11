import { IconContext } from '@react-icons/all-files'
import Document, { Head, Html, Main, NextScript } from 'next/document'

import { language } from '@/lib/config'

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
          </Head>

          <body>
            <Main />
            <NextScript />
          </body>
        </Html>
      </IconContext.Provider>
    )
  }
}
