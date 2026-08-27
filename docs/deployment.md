# Deployment

folionote를 Vercel에 배포하고 자기 도메인을 연결하는 가이드.

## Vercel 배포 (추천)

### 방법 A: 원클릭 (가장 빠름)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnobel6018%2Ffolionote)

GitHub 권한 grant → repo 생성 → 자동 빌드/배포.

### 방법 B: Vercel CLI

```bash
cd my-site
vercel       # preview deployment, 첫 실행 시 OAuth 로그인 + project link interactive
vercel --prod
```

질문 답변 (대부분 기본값 OK):

- **Set up and deploy** → Y
- **Link to existing project** → N (새 project 생성)
- **Project name** → `folionote` 또는 자유
- **Modify settings** → N (Next.js 자동 감지)

빌드 시간 1-2분. URL 출력됨 (예: `folionote-xxx.vercel.app`).

## 환경변수 (Vercel UI)

대부분 optional. 필요 시 Vercel project Settings → Environment Variables에 추가:

- `NEXT_PUBLIC_FATHOM_ID`, `NEXT_PUBLIC_POSTHOG_ID` — analytics
- `REDIS_HOST`, `REDIS_PASSWORD` — preview image cache (Vercel KV / Upstash)
- `TWITTER_ACCESS_TOKEN` — 트윗 embed

## Custom Domain 연결

### Step 1: Vercel project에 도메인 추가

Vercel UI: Project Settings → Domains → "Add Domain" → 도메인 입력

또는 CLI:

```bash
vercel domains add mydomain.com folionote
```

Vercel이 DNS instruction 표시:

- **Subdomain** (예: `blog.mydomain.com`):
  ```
  Type:  CNAME
  Name:  blog
  Value: cname.vercel-dns.com
  ```
- **Apex domain** (예: `mydomain.com`):
  ```
  Type:  A
  Name:  @
  Value: 76.76.21.21
  ```

### Step 2: DNS provider에 record 추가

#### Cloudflare

1. DNS → Records → Add record
2. Vercel 안내 값 그대로 입력
3. Proxy status: **DNS only** (회색 구름) — Vercel이 SSL 처리하므로 Cloudflare proxy 불필요
4. Save

#### AWS Route 53

1. Hosted zones → 자기 도메인 → Create record
2. Vercel 안내 값 그대로 입력. Apex 도메인은 _ALIAS to Vercel_ 또는 _A record 76.76.21.21_ 둘 다 가능

#### AWS CLI 예시 (Subdomain)

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id <ZONE_ID> \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "blog.mydomain.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "cname.vercel-dns.com"}]
      }
    }]
  }'
```

### Step 3: SSL 자동 발급 대기

Vercel이 Let's Encrypt SSL을 자동 발급 (1-5분).

검증:

```bash
curl -I https://mydomain.com
# → status 200 + Vercel headers
```

## 기존 도메인에서 새 도메인으로 옮기기 (레퍼런스 서비스 → folionote)

기존 사이트(예: blog.mydomain.com)에서 folionote로 옮길 때 SEO 권위 보존:

1. **새 도메인을 먼저 동작 확인** (preview URL 또는 임시 도메인)
2. **301 redirect 셋업**: 기존 URL → 새 URL
   - 레퍼런스 서비스: 어드민에서 redirect 셋업 가능 여부 확인
   - 또는 기존 도메인을 Vercel에 추가 + Vercel rewrites로 308 redirect
3. **Google Search Console** _Change of Address_ tool로 새 도메인 등록 + 변경 알림
4. **sitemap.xml 갱신**: 새 도메인 기준으로 다시 제출

## ISR + 캐시 전략

빌드 시 152 페이지 동시 SSG는 Notion API rate limit (429)에 걸려 실패. 우리는:

- **메인 페이지**: SSG + revalidate 600s (10분 ISR)
- **본문 페이지**: `fallback: 'blocking'` lazy SSG — 첫 요청 시 server-side fetch + 캐시
- **sitemap.xml**: 8h CDN cache + memory cache + fallback (3-tier 방어)

따라서 build 시간 1-2분, Vercel build server에서 rate limit 거의 안 침.

## Troubleshooting

- **Build fails with 429**: Notion API rate limit. 잠시 후 재시도 또는 Vercel build server에서 retry
- **본문 페이지 첫 요청 느림**: lazy SSG (server-side fetch). 정상. 이후 ISR 캐시 hit
- **sitemap.xml에 minimal 응답만**: getSiteMap이 Notion API 실패. fallback 작동 중. 일단 정상 응답이지만 진짜 sitemap이 필요하면 cache 갱신 또는 build-time generation 검토
