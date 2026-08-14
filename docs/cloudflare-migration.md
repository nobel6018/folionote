# Cloudflare Workers 이전 검토 (2026-08-14)

Vercel 대신 Cloudflare Workers에 올릴 수 있는지 실제로 옮겨서 Worker 런타임으로
돌려본 기록입니다. **결론은 옮기지 않는 쪽입니다.** 기능 두 개를 잃고, 얻는 것은
호스팅 일원화뿐입니다.

도메인은 Cloudflare에서 사고 DNS도 Cloudflare에 두되, 배포는 Vercel에 남깁니다.
프록시(주황 구름)만 끄면 됩니다 (@see setup-guide.md).

작업물은 `feat/cloudflare-deploy` 브랜치에 있습니다. 나중에 판단이 바뀌면 거기서
이어가면 됩니다. main에 병합하지 않은 이유는 `sharp` 추적 제외가 Vercel의
미리보기 이미지를 깨뜨리기 때문입니다.

## 동작한 것

| 항목                  | 결과                                      |
| --------------------- | ----------------------------------------- |
| 사이트 페이지 렌더    | 정상 (홈 64KB)                            |
| `/sitemap.xml`        | 정상                                      |
| `/feed/`, `/feed.xml` | 정상                                      |
| `/robots.txt`         | 정상                                      |
| Worker 스크립트 크기  | 압축 1.78MiB (무료 한도 3MiB, 유료 10MiB) |

크기는 걱정거리가 아니었습니다. `.open-next/server-functions`가 41MB로 커 보이지만
실제 업로드되는 스크립트는 `handler.mjs` 하나이고 압축하면 1.78MiB입니다.

## 깨진 것

### 소셜 이미지 (`next/og`)

```
Error: [unenv] fs.readFileSync is not implemented yet!
```

`next/og`의 ImageResponse는 satori와 resvg의 WASM, 그리고 폰트 파일을
`fs.readFileSync`로 읽습니다. Cloudflare가 제공하는 Node 호환 층(unenv)에 그 함수가
구현돼 있지 않아 500이 납니다.

"edge 런타임 선언만 지우면 `next/og`가 Node 런타임에서 그대로 된다"는 안내를
여러 곳에서 볼 수 있는데, 이 프로젝트에서는 그렇지 않았습니다. edge 선언을 지우고
Node 런타임 규약(`req.query` 사용, `res`로 본문 쓰기)까지 맞춘 뒤에도 같은 오류가
남았습니다.

우회하려면 빌드 타임에 카드 이미지를 미리 만들어 정적 파일로 두거나, Cloudflare
Browser Rendering으로 별도 생성해야 합니다. 둘 다 작업량이 상당합니다.

### LQIP 블러 미리보기 (`sharp`)

`lqip-modern`이 네이티브 모듈 `sharp`에 의존합니다. Workers에는 네이티브 바이너리를
올릴 수 없어서 **우회 방법이 없습니다.** `isPreviewImageSupportEnabled`를 꺼야 하고,
그러면 카드 이미지가 로드되기 전 흐릿한 자리표시 대신 빈 칸이 보입니다.

## 옮긴다면 추가로 드는 것

**ISR 캐시 저장소.** Vercel은 플랫폼이 알아서 하지만 Workers에서는 KV 네임스페이스를
만들어 바인딩해야 합니다. 없으면 `revalidate`가 동작하지 않고 모든 요청이 Notion까지
갑니다. 이 사이트는 10분 주기 ISR이라 캐시가 없으면 Notion 레이트 리밋에 바로
걸립니다. fork한 사람이 만들어야 하는 리소스가 하나 늘어납니다.

**어드민 리포 자동 감지.** 배포 어드민이 `VERCEL_GIT_REPO_OWNER`와
`VERCEL_GIT_REPO_SLUG`로 커밋 대상 리포를 자동으로 잡습니다. Cloudflare에는 그
변수가 없어서 `GITHUB_REPO`가 필수가 됩니다.

**pnpm 구조.** 어댑터가 `node_modules`를 복사한 뒤 esbuild로 묶는데 pnpm의 심링크
구조를 따라가지 못합니다. `.npmrc`에 `node-linker=hoisted`가 필요했습니다.

**`ofetch` 강제 포함.** 조건부 exports로 런타임마다 다른 파일을 내보내는데, Next
추적기는 `node` 조건의 `dist/node.mjs`만 가져가고 Workers 번들러는 `worker` 조건의
`dist/index.mjs`를 찾습니다. `outputFileTracingIncludes`로 패키지를 통째로 넣어야
합니다.

## 재현 방법

```bash
git checkout feat/cloudflare-deploy
pnpm install
pnpm cf:build
pnpm cf:preview --port 8788
```

Worker 안의 오류는 로컬 관측 API로 봅니다. 콘솔에는 500만 찍히고 이유가 안 나옵니다.

```bash
curl -X POST http://localhost:8788/cdn-cgi/local/explorer/api/local/observability/query \
  -H 'Content-Type: application/json' \
  -d '{"sql":"SELECT message FROM logs ORDER BY rowid DESC LIMIT 10"}'
```

## 다시 검토할 조건

다음 중 하나가 바뀌면 판단이 달라집니다.

- Cloudflare의 unenv가 `fs.readFileSync`를 구현하거나 `next/og`가 파일 읽기를 안 하게 바뀐다
- 소셜 이미지를 빌드 타임 생성으로 옮긴다 (그러면 Workers 제약이 사라진다)
- LQIP를 포기해도 되는 사이트다 (이미지가 적은 문서 사이트라면 체감이 작다)
