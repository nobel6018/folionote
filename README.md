# folionote

> Inspired by 노션을 웹으로 배포하는 상용 서비스. An independent, open-source reimplementation — Notion 페이지를 정적 사이트로 배포하는 Next.js 기반 OSS 프로젝트.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnobel6018%2Ffolionote)

## 무엇인가

상용 서비스는 Notion 페이지를 자기 도메인의 정적 사이트로 배포해주는 한국 SaaS다. folionote는 그 핵심 기능 — *Notion 페이지를 예쁘게 정적 렌더링 + pretty URL + 다크모드 + 네비게이션* — 을 본인이 호스팅할 수 있는 OSS로 다시 만든 것.

이 프로젝트는 [`nextjs-notion-starter-kit`](https://github.com/transitive-bullshit/nextjs-notion-starter-kit) (by Travis Fischer)을 베이스로 fork됐고, 레퍼런스 서비스의 시각 디자인과 사용성에서 영감을 받았다. **레퍼런스 서비스의 코드/CSS를 직접 카피하지 않았다** — 디자인 토큰만 추출해서 새로 구현한 독립 프로젝트.

## 주요 기능

- **Notion → 정적 사이트** (SSG + ISR via Next.js)
- **Pretty URL** (`/about`, `/posts/my-post` 등 사용자 정의)
- **다크모드 3-state** (system / dark / light, OS 변경 자동 반영, localStorage 우선)
- **네비게이션 바** (config 기반)
- **OG/SEO/sitemap 자동 생성**
- **Vercel 원클릭 배포**
- **설정 화면** (`/admin`, 개발 서버 전용) — 폼으로 편집 + 실시간 미리보기

## 빠른 시작

### 1. Notion 준비

1. 사이트로 만들 Notion 페이지를 준비하고 *Share → Anyone with link*로 공개
2. 페이지 URL에서 page ID 추출 (URL 끝의 32자 hex)

예: `https://www.notion.so/My-Site-67890abcdef1234567890abcdef12345` → page ID는 `67890abcdef1234567890abcdef12345`

### 2. 클론 + 설정

```bash
git clone https://github.com/nobel6018/folionote.git my-site
cd my-site
pnpm install
```

`site.config.ts`에서 자기 페이지 ID와 사이트 정보 입력:

```ts
export default siteConfig({
  rootNotionPageId: 'YOUR_NOTION_PAGE_ID',
  name: 'My Site',
  domain: 'mysite.com',
  author: 'Your Name',
  // ...
})
```

### 3. 로컬 실행

```bash
pnpm dev   # http://localhost:3000
```

설정은 <http://localhost:3000/admin>에서 폼으로 편집할 수 있다. 저장하면
`site.config.ts`가 다시 쓰이고 미리보기가 갱신된다(개발 서버 전용).

### 4. 배포

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnobel6018%2Ffolionote)

또는:
```bash
pnpm build
pnpm vercel deploy
```

## 문서

- [getting-started](docs/getting-started.md) — 5단계 Quick start
- [configuration](docs/configuration.md) — `site.config.ts` 옵션 전체
- [customization](docs/customization.md) — 디자인 토큰 + 자체 컴포넌트
- [deployment](docs/deployment.md) — Vercel + DNS (Cloudflare/Route 53) + 도메인 이전

## 데모

[folionote.vercel.app](https://folionote.vercel.app)이 이 레포를 그대로 배포한 것이다.
그 사이트의 내용은 Notion 페이지 하나이고, 이 레포의 `site.config.ts`가 그 페이지를
가리킨다. 즉 **데모 사이트가 곧 설정 예시**다.

fork한 뒤 `rootNotionPageId`, `name`, `domain` 셋만 자기 값으로 바꾸면 바로 뜬다.
자세한 순서는 [setup-guide](docs/setup-guide.md)에 있다.

## 라이선스

MIT — [LICENSE](LICENSE) 참고. `nextjs-notion-starter-kit` 원본의 MIT 저작권 표시 보존됨.

## 크레딧

- 디자인 영감: 노션을 웹으로 배포하는 상용 서비스 (레퍼런스 서비스)
- 베이스 프로젝트: [`nextjs-notion-starter-kit`](https://github.com/transitive-bullshit/nextjs-notion-starter-kit) by Travis Fischer
- Notion 렌더링: [`react-notion-x`](https://github.com/NotionX/react-notion-x)
