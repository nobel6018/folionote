# MCP 서버

배포된 사이트마다 `/api/mcp`에 MCP 서버가 붙는다. Claude Code 같은 AI 클라이언트가 이걸로
사이트를 읽고, "Notion과 다르다", "다운로드가 깨졌다" 같은 문제를 진단하고, 즉시 갱신이나
주소 추가 같은 운영 일을 한다.

사이트 밖에 따로 서버를 두지 않은 이유는 둘이다. 진단은 **이 배포가 방문자에게 내보내는
캐시된 HTML**을 봐야 하고, 즉시 갱신(`res.revalidate`)은 이 Next 앱 안에서만 부를 수 있다.

## 켜기

`MCP_SECRET`을 넣고 재배포한다. 없으면 `/api/mcp`는 404다(fail-closed).

```bash
openssl rand -base64 32 | vercel env add MCP_SECRET production
vercel --prod
```

Claude Code에 붙이기:

```bash
claude mcp add --transport http folionote https://<도메인>/api/mcp \
  --header "Authorization: Bearer <MCP_SECRET>"
```

인증은 `Authorization: Bearer`만 본다. claude.ai 웹의 커스텀 커넥터는 OAuth를 요구해서
지금은 붙지 않는다.

## 도구

| 묶음 | 도구 | 하는 일 |
| --- | --- | --- |
| 읽기 | `get_site_config` | 이름, 도메인, 루트 페이지, strictPaths, noindex, 켜진 기능 |
| 읽기 | `list_pages` | pretty URL 목록(pageUrlOverrides, pageUrlAdditions)과 Notion ID |
| 읽기 | `get_page` | Notion의 현재 본문을 markdown으로 |
| 읽기 | `search` | 루트 페이지 아래 Notion 검색 |
| 진단 | `check_freshness` | 캐시된 HTML과 Notion을 블록 단위로 비교. 바뀐 블록, 지워진 블록, 캐시 상태 |
| 진단 | `check_links` | 페이지의 Notion 파일 링크와 사이트 안 링크를 열어 4xx/5xx 찾기 |
| 진단 | `seo_audit` | robots.txt, sitemap.xml, noindex와 페이지 메타(title, description, canonical, og:image) |
| 운영 | `revalidate` | 페이지를 지금 다시 만들기. 페이지 ID를 주면 pretty URL과 ID 주소를 함께 |
| 운영 | `add_page_url` | pageUrlOverrides에 주소를 넣어 GitHub에 커밋(재배포가 따라온다) |
| 운영 | `warm_cache` | 주소를 차례로 요청해 캐시 채우기. 45초 예산 |
| 통계 | `get_pageviews` | 오늘, 누적 페이지뷰(Redis와 페이지뷰 카운트가 켜진 사이트만) |

### 흔한 흐름

"Notion에서 고쳤는데 사이트가 그대로"면 `check_freshness`로 보고, 다르면 `revalidate`로
바로 바꾼다. Notion에서 파일 블록을 갈아 끼운 뒤라면 `check_links`가 지워진 파일을 가리키는
다운로드 링크(400)를 잡는다.

`check_freshness`는 HTML의 `__NEXT_DATA__`에 실린 recordMap과 Notion을 블록마다
`last_edited_time`으로 맞춰 본다. 내비게이션 링크처럼 다른 페이지에서 합쳐 온 블록은
지워진 것으로 세지 않는다. 부모 블록의 자식 목록에서 빠졌는지로 판단하기 때문이다.

## add_page_url

어드민은 로그인한 사람의 GitHub OAuth 토큰으로 커밋하지만 MCP 호출에는 브라우저 세션이
없다. 그래서 서버에 토큰을 따로 둔다.

| 환경변수 | 값 |
| --- | --- |
| `MCP_GITHUB_TOKEN` | 이 리포 하나에 **Contents: Read and write**만 준 fine-grained 토큰 |
| `GITHUB_REPO` | Vercel git 연동이면 생략(자동). 아니면 `owner/repo` |

`site.config.ts` 전체를 `serializeSiteConfig`로 다시 써서 커밋한다. 어드민 저장과 같은
방식이라 파일에 손으로 단 주석은 사라진다. 먼저 `dryRun: true`로 넣을 줄을 확인할 수 있다.
같은 주소가 이미 있거나, 그 페이지가 이미 다른 pretty URL을 가지면 거절한다. 한 페이지에
주소가 둘이면 사이트가 링크를 어느 쪽으로 걸지 정할 수 없다.

## 동작 방식

- 무상태(stateless) Streamable HTTP다. 요청마다 서버와 트랜스포트를 새로 만든다.
  서버리스 함수는 요청 사이에 메모리를 이어 쓴다는 보장이 없어 세션을 들고 있을 수 없다.
  그래서 POST만 받고 GET(SSE), DELETE는 405다
- 응답은 SSE가 아니라 JSON 한 번이다(`enableJsonResponse`). 진행 알림을 보낼 도구가 없다
- 진단 도구는 자기 사이트를 요청이 들어온 호스트로 다시 요청한다. 프리뷰 배포에 붙이면 그
  프리뷰를 본다
- 함수 제한 시간은 60초(`maxDuration`). 링크 확인은 60개, 동시 4개까지다

## 관련 코드

| 파일 | 내용 |
| --- | --- |
| `pages/api/mcp.ts` | 인증, 트랜스포트, 도구 등록 |
| `lib/mcp/tools/read.ts` | `get_site_config`, `list_pages`, `get_page`, `search` |
| `lib/mcp/tools/diagnose.ts` | `check_freshness`, `check_links`, `seo_audit` |
| `lib/mcp/tools/operate.ts` | `revalidate`, `add_page_url`, `warm_cache` |
| `lib/mcp/tools/stats.ts` | `get_pageviews` |
| `lib/mcp/markdown.ts` | recordMap을 markdown으로 |
| `lib/mcp/site.ts` | 페이지 주소 해석, 자기 사이트 요청, `__NEXT_DATA__` 읽기 |
| `lib/revalidate.ts` | Bearer 인증, 즉시 갱신. `/api/revalidate`와 같이 쓴다 |
