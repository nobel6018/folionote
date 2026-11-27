// Inter에는 한글과 한자가 없다. 전체 CJK 폰트를 번들에 넣으면 수 MB라 Lambda 콜드
// 스타트가 느려지므로, 그릴 글자만 Google Fonts의 text= 서브셋으로 받아 온다.
// Noto Sans KR은 한글을 담고 있지만 李裪의 裪 같은 드문 한자가 없어서, 한자를 넓게 담은
// Noto Sans SC를 뒤에 둔다. satori는 글자마다 앞 폰트에 없으면 다음 폰트를 쓴다.
// User-Agent 없이 요청하면 Google이 satori가 읽는 TTF를 준다(woff2는 못 읽는다).

type OgFont = {
  name: string
  data: ArrayBuffer
  weight: 700
  style: 'normal'
}

const FAMILIES = ['Noto Sans KR', 'Noto Sans SC'] as const

const cache = new Map<string, Promise<ArrayBuffer | undefined>>()

async function fetchSubset(
  family: string,
  text: string
): Promise<ArrayBuffer | undefined> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family
  )}:wght@700&text=${encodeURIComponent(text)}`
  const css = await fetch(cssUrl).then((res) => (res.ok ? res.text() : ''))
  const fontUrl = css.match(
    /src: url\((.+?)\) format\('(?:truetype|opentype)'\)/
  )?.[1]
  if (!fontUrl) {
    return undefined
  }
  const res = await fetch(fontUrl)
  return res.ok ? res.arrayBuffer() : undefined
}

export async function loadCjkFonts(text: string): Promise<OgFont[]> {
  const chars = [...new Set(text)].filter((c) => c.codePointAt(0)! > 0x2e_7f)
  if (chars.length === 0) {
    return []
  }
  const subset = chars.toSorted().join('')

  const results = await Promise.all(
    FAMILIES.map(async (family): Promise<OgFont | undefined> => {
      const key = `${family}:${subset}`
      let pending = cache.get(key)
      if (!pending) {
        // 실패하면 캐시에 남기지 않아 다음 요청이 다시 받는다
        pending = fetchSubset(family, subset).catch(() => undefined)
        cache.set(key, pending)
        void pending.then((data) => {
          if (!data) cache.delete(key)
        })
      }
      const data = await pending
      return data
        ? { name: family, data, weight: 700, style: 'normal' }
        : undefined
    })
  )

  return results.filter((font): font is OgFont => !!font)
}
