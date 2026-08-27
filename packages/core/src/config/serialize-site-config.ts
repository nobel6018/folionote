import { type SiteConfig } from './site-config.js'

/**
 * SiteConfig 객체를 `site.config.ts` 소스로 다시 써낸다 (어드민 저장용).
 *
 * 왜 통째로 다시 쓰는가: 값만 골라 치환하려면 TS를 AST로 파싱해 수술해야 하고,
 * 주석이나 포맷이 조금만 달라도 깨진다. 대신 이 직렬화기가 파일 포맷의 주인이
 * 되어 설명 주석까지 같이 생성한다. 그래서 저장해도 문서가 사라지지 않는다.
 *
 * UI가 모르는 키도 값 그대로 통과시킨다(아래 KNOWN_ORDER에 없으면 뒤에 붙는다).
 * 어드민이 다루지 않는 설정을 손으로 넣어 뒀더라도 저장 때 날아가지 않는다.
 *
 * @see pages/api/admin/config.ts
 */

/** 출력 순서. 여기 없는 키는 이 뒤에 알파벳 순으로 붙는다 */
const KNOWN_ORDER: Array<keyof SiteConfig> = [
  'rootNotionPageId',
  'rootNotionSpaceId',
  'name',
  'domain',
  'author',
  'description',
  'language',
  'twitter',
  'github',
  'linkedin',
  'newsletter',
  'youtube',
  'mastodon',
  'zhihu',
  'defaultPageIcon',
  'defaultPageCover',
  'defaultPageCoverPosition',
  'isPreviewImageSupportEnabled',
  'isTweetEmbedSupportEnabled',
  'isRedisEnabled',
  'isSearchEnabled',
  'includeNotionIdInUrls',
  'pageUrlOverrides',
  'pageUrlAdditions',
  'dateFormat',
  'colorTheme',
  'font',
  'logo',
  'navigationStyle',
  'navigationLinks',
  'isShareButtonEnabled',
  'isCollectionViewTabsEnabled',
  'isCollectionSearchEnabled',
  'scrollProgressBar',
  'backToTop',
  'cta',
  'popups',
  'popupOptions',
  'bottomNavigation',
  'pageViewCount',
  'customCode',
  'pageMeta'
]

/** 키 위에 붙일 설명. 없으면 주석 없이 값만 쓴다 */
const COMMENTS: Partial<Record<keyof SiteConfig, string>> = {
  rootNotionPageId: '사이트 루트가 될 Notion 페이지 (필수)',
  rootNotionSpaceId: '특정 Notion 워크스페이스로 제한할 때만 지정',
  name: '사이트 기본 정보 (필수)',
  description: 'Open Graph 설명',
  isPreviewImageSupportEnabled: '커버 이미지의 LQIP 미리보기 생성 여부',
  isRedisEnabled:
    'Redis 캐시. 켜면 REDIS_HOST / REDIS_PASSWORD 환경변수가 필요하다.\n페이지뷰 카운트도 이 값이 켜져 있어야 동작한다.',
  pageUrlOverrides:
    'pretty URL 매핑. 키가 경로, 값이 Notion 블록 ID(하이픈 없는 32자 hex).\nnavigationLinks에서 url로 참조하는 경로는 여기에도 반드시 있어야 한다.',
  dateFormat: '컬렉션 카드/속성의 날짜 형식 (@see lib/format-date.ts)',
  colorTheme:
    "색상 테마. 'system'은 OS 설정을 따르고 헤더에 토글을 노출한다.\n'light'/'dark'로 고정하거나 'custom'으로 색을 직접 지정하면 토글이 사라진다.",
  font: '본문 폰트. 생략하면 Pretendard 한 종. 레지스트리 키는 lib/fonts.ts 참고',
  logo: '헤더 좌측 로고. 생략하면 사이트 이름이 텍스트로 나온다',
  navigationStyle:
    "'custom'이면 레퍼런스 서비스 풍 자체 헤더, 'default'면 react-notion-x 기본 헤더",
  navigationLinks: '헤더에 노출할 nav 링크',
  scrollProgressBar: '페이지 상단 읽기 진행률 바',
  backToTop: '맨 위로 버튼',
  cta: '화면 하단에 떠 있는 CTA 버튼',
  popups:
    'id는 "다시 보지 않기" 기록 키다. 내용을 바꾸면 id도 바꿔야\n이미 닫은 방문자에게 새 내용이 보인다.',
  bottomNavigation: '모바일 하단 탭바 (좁은 화면에서만 보인다)',
  customCode:
    '사용자 코드 주입. bodyStart/bodyEnd는 원본 HTML, css는 사이트 CSS 뒤에 붙는다.\n@see docs/custom-code.md',
  pageMeta:
    '페이지별 SEO 메타 덮어쓰기. 키는 하이픈 없는 32자 Notion 페이지 ID.\nnoindex를 켜면 사이트맵에서도 빠진다.',
  pageViewCount:
    '페이지뷰 카운트. isRedisEnabled와 REDIS_* 환경변수가 함께 있어야 동작한다.'
}

const INDENT = '  '

/**
 * 문자열을 JS 리터럴로 만든다.
 *
 * 예전에는 `'${value.replaceAll("'", "\\'")}'` 한 줄이었다. 두 가지가 깨진다.
 * 개행이 들어 있으면 작은따옴표 문자열 안에 raw 개행이 들어가 문법 오류가 되고,
 * 백슬래시를 이스케이프하지 않아 CSS의 `\\2014` 같은 값이 다른 문자로 바뀐다.
 * 커스텀 CSS/스크립트를 설정에 담기 시작하면서 둘 다 실제로 걸린다.
 *
 * 여러 줄은 템플릿 리터럴로 쓴다. 그래야 저장된 파일에서도 원문 그대로 읽힌다.
 */
function stringLiteral(value: string): string {
  if (value.includes('\n')) {
    const escaped = value
      .replaceAll('\\', '\\\\')
      .replaceAll('`', '\\`')
      // 템플릿 리터럴 안에서 살아나는 보간을 막는다
      .replaceAll('${', '\\${')
    return `\`${escaped}\``
  }

  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

/** JS 리터럴로 직렬화. JSON.stringify와 달리 키 따옴표를 필요할 때만 붙인다 */
function toLiteral(value: unknown, depth: number): string {
  const pad = INDENT.repeat(depth)
  const padInner = INDENT.repeat(depth + 1)

  if (value === null) return 'null'
  if (typeof value === 'string') return stringLiteral(value)
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const items = value.map((item) => padInner + toLiteral(item, depth + 1))
    return `[\n${items.join(',\n')}\n${pad}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, v]) => v !== undefined
    )
    if (!entries.length) return '{}'

    const body = entries.map(
      ([key, v]) => `${padInner}${quoteKey(key)}: ${toLiteral(v, depth + 1)}`
    )
    return `{\n${body.join(',\n')}\n${pad}}`
  }

  return 'null'
}

/** 식별자로 쓸 수 있으면 따옴표 없이 */
function quoteKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : `'${key}'`
}

export function serializeSiteConfig(
  config: SiteConfig,
  {
    /**
     * 생성된 파일이 `siteConfig()`를 어디서 가져올지. 자체 호스팅 앱은 패키지에서
     * 바로 받으면 되지만, 헬퍼를 자기 리포에 다시 감싼 쪽은 그 경로를 넘긴다.
     */
    importFrom = '@folionote/core/config'
  }: { importFrom?: string } = {}
): string {
  const keys = Object.keys(config) as Array<keyof SiteConfig>
  const ordered = [
    ...KNOWN_ORDER.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !KNOWN_ORDER.includes(key)).toSorted()
  ]

  const blocks = ordered
    .filter((key) => config[key] !== undefined)
    .map((key) => {
      const comment = COMMENTS[key]
      const commentLines = comment
        ? comment
            .split('\n')
            .map((line) => `${INDENT}// ${line}`)
            .join('\n') + '\n'
        : ''

      return `${commentLines}${INDENT}${quoteKey(key)}: ${toLiteral(
        config[key],
        1
      )}`
    })

  return `import { siteConfig } from '${importFrom}'

// 이 파일은 /admin 화면에서 저장할 때 자동으로 다시 쓰인다.
// 손으로 편집해도 되지만, 저장하면 포맷과 주석이 이 형식으로 정리된다.
// @see @folionote/core/src/config/serialize-site-config.ts

export default siteConfig({
${blocks.join(',\n\n')}
})
`
}
