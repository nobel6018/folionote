/**
 * 웹폰트 레지스트리 (레퍼런스 서비스 어드민의 스타일 > 폰트).
 *
 * 레퍼런스 서비스는 한국어 폰트 17종 이상을 자체 CDN에서 제공한다. 그중 상당수는
 * (TmoneyRoundWind, NanumSquare, S-CoreDream, Gmarket Sans, RIDIBatang 등)
 * 상업적 이용은 무료지만 재배포 조건이 제각각이라 OSS 기본값으로 묶어 두기
 * 어렵다. 그래서 여기에는 **OFL/Apache로 CDN 배포가 명확한 폰트만** 담았고,
 * 나머지는 `{ family, url }`로 직접 지정하는 길을 열어 뒀다.
 *
 * @see docs/customization.md
 */

export type FontEntry = {
  /** CSS font-family 이름 */
  family: string
  /** 스타일시트 URL. 시스템 폰트라 받을 필요가 없으면 생략 */
  url?: string
}

const googleFont = (family: string, weights: string): FontEntry => ({
  family,
  url: `https://fonts.googleapis.com/css2?family=${family.replaceAll(
    ' ',
    '+'
  )}:wght@${weights}&display=swap`
})

/**
 * 키는 site.config.ts에서 쓰는 이름이다. 요청 weight는 각 폰트가 실제로
 * 제공하는 것만 넣었다. Google Fonts는 없는 weight를 요구하면 400을 준다.
 */
export const FONT_REGISTRY: Record<string, FontEntry> = {
  // 한국어 (라틴 글리프도 포함)
  pretendard: {
    family: 'Pretendard Variable',
    // dynamic-subset: 페이지에 쓰인 글자만 unicode-range로 내려받는다
    url: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css'
  },
  'noto-sans-kr': googleFont('Noto Sans KR', '400;500;700'),
  'gothic-a1': googleFont('Gothic A1', '400;500;700'),
  'nanum-gothic': googleFont('Nanum Gothic', '400;700;800'),
  'nanum-myeongjo': googleFont('Nanum Myeongjo', '400;700;800'),
  'ibm-plex-sans-kr': googleFont('IBM Plex Sans KR', '400;500;700'),
  'gowun-dodum': googleFont('Gowun Dodum', '400'),
  'gowun-batang': googleFont('Gowun Batang', '400;700'),
  'black-han-sans': googleFont('Black Han Sans', '400'),
  'do-hyeon': googleFont('Do Hyeon', '400'),
  jua: googleFont('Jua', '400'),
  'song-myung': googleFont('Song Myung', '400'),
  'nanum-pen-script': googleFont('Nanum Pen Script', '400'),
  gaegu: googleFont('Gaegu', '300;400;700'),

  // 라틴
  roboto: googleFont('Roboto', '400;500;700'),
  'open-sans': googleFont('Open Sans', '400;500;700'),
  inter: googleFont('Inter', '400;500;700'),
  lato: googleFont('Lato', '400;700'),
  montserrat: googleFont('Montserrat', '400;500;700'),

  // 일본어
  'noto-sans-jp': googleFont('Noto Sans JP', '400;500;700'),
  'noto-serif-jp': googleFont('Noto Serif JP', '400;700'),
  'm-plus-1p': googleFont('M PLUS 1p', '400;500;700')
}

export type FontChoice = string | FontEntry

/**
 * 설정값을 FontEntry로 바꾼다.
 *
 * 문자열은 먼저 레지스트리 키로 찾고, 없으면 이미 사용할 수 있는 font-family
 * 이름으로 취급한다(시스템 폰트나 사용자가 직접 임베드한 폰트).
 */
export function resolveFont(choice: FontChoice): FontEntry {
  if (typeof choice !== 'string') {
    return choice
  }

  return FONT_REGISTRY[choice] ?? { family: choice }
}

/** font-family 값에 넣을 때 공백이 있으면 따옴표로 감싼다 */
export function quoteFamily(family: string): string {
  return /[\s]/.test(family) && !/^["']/.test(family) ? `'${family}'` : family
}
