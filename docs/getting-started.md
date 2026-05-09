# Getting Started

folionote로 자신의 Notion 페이지를 정적 사이트로 띄우는 5단계 가이드.

## 1. Notion 페이지 준비

1. Notion에서 사이트의 root 페이지를 결정 (예: "내 블로그")
2. 페이지 우상단 *Share* → *"Anyone with the link"*로 공개
3. 페이지 URL에서 **page ID** 추출 — URL 끝의 32자 hex
   ```
   https://www.notion.so/My-Site-67890abcdef1234567890abcdef12345
                              ↑ 여기 끝의 32자가 page ID
   ```

## 2. 클론 + 의존성 설치

```bash
git clone https://github.com/nobel6018/folionote.git my-site
cd my-site
pnpm install   # 또는 npm/yarn
```

## 3. site.config.ts 수정

```ts
export default siteConfig({
  rootNotionPageId: 'YOUR_NOTION_PAGE_ID',  // ← 1단계에서 추출한 32자
  name: 'My Site',
  domain: 'mysite.com',
  author: 'Your Name',
  description: 'My blog description',

  // (선택) 헤더 nav 링크
  navigationLinks: [
    { title: 'About', pageId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }
  ],

  // (선택) pretty URL 매핑
  pageUrlOverrides: {
    '/about': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  }
})
```

옵션 전체 설명: [configuration.md](configuration.md)

## 4. 로컬 실행

```bash
pnpm dev
# → http://localhost:3000
```

처음 페이지 진입 시 Notion API fetch로 5-15초. 이후 Hot Reload + ISR 캐시.

## 5. 배포

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnobel6018%2Ffolionote)

또는 CLI:
```bash
vercel       # preview
vercel --prod
```

자세한 배포 + 도메인 연결: [deployment.md](deployment.md)

---

## 다음 단계

- 디자인 커스터마이징 → [customization.md](customization.md)
- 환경변수 (analytics, redis 등 옵션) → `.env.example` 참고
- 도메인 연결 → [deployment.md](deployment.md)
