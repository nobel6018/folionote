# AGENTS.md

folionote 리포에서 코딩 에이전트가 알아야 할 것을 모았다. 가장 흔한 요청은 "내 Notion
페이지를 배포해줘"이므로 [셋업 플레이북](#셋업-플레이북)을 먼저 본다. 사람이 읽는
설명은 `README.md`와 `docs/`에 있고, 이 문서는 판단에 필요한 사실과 절차만 담는다.

## 이 리포가 하는 일

Notion 페이지 하나를 루트로 잡아 Next.js(Pages Router) 사이트로 발행한다. 렌더링은
`react-notion-x`, 데이터는 비공식 API인 `notion-client`로 읽는다. 배포 대상은
Vercel이다. Cloudflare Workers로 옮기는 것은 실제로 옮겨 본 뒤 접었다. `next/og`가
폰트와 WASM을 `fs`로 읽는데 Workers의 Node 심에 `fs.readFileSync`가 없어 소셜 이미지가
죽고, LQIP 블러 미리보기가 쓰는 `sharp`는 네이티브 모듈이라 Workers에 올릴 수 없다.
실측 기록은 `docs/cloudflare-migration.md`에 있다. 도메인과 DNS를 Cloudflare에 두는 것은
문제가 없고, 배포만 Vercel에 남긴다.

## 사람만 할 수 있는 일

API가 없어서 브라우저에서만 되는 일이 셋이다. 대신 하려 들지 말고 그 지점에서 멈춘 뒤,
어느 주소에서 무엇을 눌러 어떤 값을 넣어야 하는지까지 알려주고 사용자가 끝냈다고 할
때까지 기다린다.

1. **Notion 페이지 "웹에 게시"**. Notion API에 공개 설정을 켜는 엔드포인트가 없다.
   "링크 공유"와 다른 설정이라 사용자가 헷갈리기 쉽다. 공유 버튼의 게시 탭이라고
   짚어준다.
2. **GitHub OAuth 앱 등록**. GitHub REST API에 OAuth App 생성 엔드포인트가 없다
   (GitHub App은 매니페스트 플로우가 있지만 그것도 브라우저 왕복이 필요하다). 어드민을
   쓸 때만 필요하다. 값이 채워진 등록 링크를 만들어 주면 사용자가 클릭만 하면 된다.
3. **도메인 구입 결제**. 결제는 사람이 한다.

리포 포크, 환경변수 등록, 배포, DNS 레코드 추가는 전부 CLI나 API로 된다.

## 셋업 플레이북

각 단계가 끝날 때마다 아래 "확인" 명령으로 실제 동작을 보고 결과를 보고한다. 추측한
것을 보고하지 않는다. 확인이 실패하면 다음 단계로 넘어가지 않는다.

### 0. 사전 확인

`gh auth status`, `vercel whoami`, `node -v`(18 이상), `pnpm -v`를 확인한다. 로그인이
안 돼 있으면 어떤 명령을 실행해야 하는지 알려준다. 사용자에게서 Notion 페이지 URL,
사이트 이름, 쓸 도메인(없으면 생략), 어드민 필요 여부를 받는다.

### 1. 어느 길로 갈지 고른다

설정값을 넣는 경로가 둘이고, `site.config.ts`에 값이 있으면 파일이 환경변수를 이긴다
(`lib/site-config-resolve.ts`). 사용자가 리포를 고칠 생각이 없다면 파일을 건드리지 않는
쪽이 짧다.

**파일 없이 가는 길**: 필요한 환경변수는 `NOTION_ROOT_PAGE_ID`와 `SITE_NAME` 두 개다.
`SITE_AUTHOR`는 없으면 `SITE_NAME`을, `SITE_DOMAIN`은 없으면 Vercel이 주입하는
호스트명을 쓴다. `NOTION_ROOT_PAGE_ID`는 32자 ID 대신 Notion 페이지 주소를 통째로 넣어도
`parsePageId`가 뽑아낸다. README의 Deploy 버튼은 리포를 복제해 Vercel 프로젝트를 만들고
첫 배포를 돌린다. 터미널에서 할 때는 `vercel env add NOTION_ROOT_PAGE_ID production`
식으로 같은 두 값을 넣는다.

**파일을 고치는 길**: fork하고 클론한 뒤 `site.config.ts`의 `rootNotionPageId`, `name`,
`domain`, `author`를 채운다. 이후 설정을 화면으로 고칠 수 있어 어드민을 쓸 사람에게 맞다.

```bash
gh repo fork nobel6018/folionote --clone
cd folionote && pnpm install
```

두 값이 파일에도 환경변수에도 없으면 빌드가 "site.config.ts의 X 또는 환경변수 Y 중
하나를 채워야 합니다" 에러로 실패한다. 실패가 아니라 안내라고 읽으면 된다.

확인: `git remote -v`로 origin이 사용자 계정인지 본다. 환경변수 경로면 `vercel env ls`에
두 값이 있는지 본다.

### 2. Notion 공개 (사람이 할 일)

여기서 멈추고 사용자에게 요청한다. Notion에서 해당 페이지를 열고 우상단 공유 버튼,
게시 탭, "웹에 게시"를 켜는 순서다.

미공개 상태여도 빌드는 실패하지 않는다. `lib/notion-errors.ts`가 실패를 종류별로 갈라
안내 화면으로 렌더한다(`components/Page404.tsx`). 그래서 판별이 쉽다. 사이트가 떴는데
"Notion 페이지가 공개되지 않았습니다"(영문 사이트는 "This Notion page is not
published")가 보이면 코드나 배포 문제가 아니라 Notion 게시 문제다.

확인: 배포 후 `curl -s https://<배포URL> | grep -c '공개되지 않았습니다'`가 0이면 통과다.
로컬이면 `PORT=3010 pnpm dev` 후 같은 방법으로 본다. 이 화면이 뜨는 동안 ISR 주기는
600초가 아니라 30초이므로, 사용자가 게시를 켜면 30초 안에 사이트로 바뀐다.

### 3. 배포

```bash
vercel link      # 기존 프로젝트에 붙일 때
vercel --prod
```

git 연동 프로젝트라면 main 푸시로도 배포된다.

확인: 출력된 URL에 `curl -I`로 200이 오는지, 2단계의 안내 화면이 아닌지 본다.
`vercel inspect <URL> --logs`로 빌드 로그를 읽는다.

### 4. 도메인 (선택)

Vercel 프로젝트에 도메인을 붙이고 DNS를 넣는다.

```bash
vercel domains add <도메인> <프로젝트명>
```

Cloudflare DNS에 넣을 레코드는 아래와 같다. 프록시(주황 구름)를 반드시 꺼야 한다.
켜두면 Cloudflare와 Vercel이 각각 SSL을 처리하려 들어 리다이렉트 루프가 난다.

| 타입  | 이름  | 값                     | 프록시        |
| ----- | ----- | ---------------------- | ------------- |
| A     | `@`   | `76.76.21.21`          | 끔 (DNS only) |
| CNAME | `www` | `cname.vercel-dns.com` | 끔 (DNS only) |

Cloudflare API 토큰이 필요하면 어떤 권한(해당 존의 DNS 편집)으로 만들어야 하는지
알려주고 사용자에게 받는다.

확인: `dig +short <도메인>`이 위 값을 가리키는지, `curl -I https://<도메인>`이 200인지
본다. SSL 발급에 1~5분이 걸리므로 그 사이의 실패는 실패로 보고하지 않는다.

### 5. 어드민 (선택, 대부분 필요 없다)

글은 Notion에서 쓰고 설정도 Notion 쪽에서 거의 끝난다. 어드민은 배포된 사이트에서
`site.config.ts`를 화면으로 고치고 싶을 때만 켠다. 사용자가 먼저 원하지 않으면 권하지
않는다.

기본값은 꺼짐이다. 필요한 환경변수 넷이 다 있을 때만 켜지고, 하나라도 없으면 `/admin`과
관련 API가 404를 준다(`lib/admin/env.ts`, fail-closed).

1. OAuth 앱 등록은 사람이 한다. 콜백 URL은
   `https://<도메인>/api/admin/auth/callback`이다. **도메인을 나중에 바꾸면 OAuth 앱의
   콜백 URL도 같이 바꿔야 한다.** 실제로 두 번 막힌 지점이다. 한 글자만 달라도 로그인이
   거부된다.
2. 사용자가 Client ID와 secret을 주면 `ADMIN_SESSION_SECRET`을
   `openssl rand -base64 32`로 만들고 셋을 `vercel env add`로 넣는다. `GITHUB_REPO`는
   Vercel git 연동 프로젝트에서 자동으로 잡히므로 생략한다.
3. 환경변수는 빌드 시점에 잡히므로 재배포한다.

프리뷰 배포에서는 어드민 로그인이 원리적으로 안 된다. 콜백 URL은 하나로 고정인데 프리뷰
호스트는 배포마다 달라진다. 프리뷰에서 로그인이 안 된다는 문의는 버그가 아니다.

확인: `/admin`에 로그인 화면이 뜨는지, 미인증 상태에서 `/api/admin/config`가 404인지 본다.

```bash
curl -o /dev/null -s -w '%{http_code}\n' https://<도메인>/api/admin/config   # 404
```

## 개발할 때 지킬 것

- `pnpm test`가 CI와 같다(`.github/workflows/build.yml`). 내용은 `eslint .`와
  `prettier --check`이고 대상은 `.js/.jsx/.ts/.tsx`다. 타입은 따로
  `npx tsc --noEmit`으로 본다.
- dev 서버는 포트를 명시한다. `PORT=3010 pnpm dev`처럼. 3000은 다른 프로젝트가 쓰고 있을
  수 있고, 그러면 Next가 조용히 다른 포트로 옮겨 붙어 확인 대상이 어긋난다.
- 주석은 한국어로 "왜"를 쓴다. 코드가 이미 말하는 "무엇"을 반복하지 않는다. 본문에
  Em dash를 쓰지 않고 필요하면 `-`를 쓴다.
- 커밋 메시지는 한국어 conventional 형식이다. `feat(admin): ...`, `fix(dark): ...`,
  `docs: ...` 형태이고 `git log --oneline`에 실례가 많다. 본문에는 왜 그렇게 했는지와
  무엇으로 검증했는지를 남긴다.
- Notion 데이터는 비공식 API로 읽는다. 짧은 시간에 많이 읽으면 429가 나고, 이 경우도
  안내 화면으로 처리된다. 빌드 때 전체 페이지를 한꺼번에 SSG하지 않는 이유가 이것이다.
  본문 페이지는 `fallback: 'blocking'` 지연 SSG다.
- ISR 주기는 600초, 오류 화면 상태에서는 30초다(`pages/index.tsx`,
  `pages/[pageId].tsx`). "Notion에서 고쳤는데 사이트가 그대로"는 대부분 이 주기 문제다.
- 모바일에서 `input`, `select`, `textarea`의 폰트를 16px 미만으로 두지 않는다. iOS
  Safari가 포커스할 때 화면을 확대하고 스스로 돌아오지 않는다. 데스크탑에서는 더 작게
  써도 된다.

## 함정

실제로 걸린 것들이다.

- zsh에서 셸 변수 이름으로 `path`를 쓰면 `PATH`가 덮여 그 셸의 모든 명령이 사라진다.
  `for path in ...` 같은 코드를 쓰지 않는다.
- Vercel 환경변수는 배포 시점에 값이 박힌다. 바꾼 뒤에는 재배포해야 한다
  (`vercel redeploy <배포URL>`).
- `SITE_NAME`, `SITE_DOMAIN` 같은 값은 이제 서버에서만 읽는다. 예전에는
  `next.config.js`의 `env`로 브라우저 번들에까지 박아 빌드 시점에 고정됐지만, 지금은
  `lib/load-site-config.ts`가 런타임에 읽어 props로 내려보낸다
  (@see docs/architecture.md). Vercel 환경변수를 바꾼 뒤 재배포가 필요한 것은
  그대로다. 값이 빌드 산출물에 남아서가 아니라 함수가 새 환경변수로 다시 떠야 하기 때문이다.
- Vercel Deploy 버튼은 fork가 아니라 복제된 새 리포를 만든다. upstream과 연결이 없어서
  이 리포의 업데이트가 자동으로 오지 않는다. 업데이트를 받을 생각이면 fork로 간다.
- Vercel Hobby 플랜은 비상업용이다. 수익이 붙는 사이트라면 요금제를 확인하라고 알린다.
- `/admin`은 필요한 값 넷이 다 잡힐 때만 켜진다(`GITHUB_REPO`는 Vercel에서 자동으로 잡히므로
  실제로 넣는 것은 셋). 하나라도 없으면 404가 정상 동작이지 버그가 아니다.
- `git filter-repo`는 실행할 때마다 `origin` remote를 지운다. 실행 후 `git remote -v`로
  확인하고 다시 추가한다.

## 문서 지도

- `docs/setup-guide.md` 셋업 전체 절차. 사람이 직접 클릭하는 수동 경로와 도메인 구입 참고
- `docs/getting-started.md` 5단계 요약 quick start
- `docs/configuration.md` `site.config.ts` 옵션 전체와 환경변수 폴백 규칙
- `docs/customization.md` 디자인 토큰과 자체 컴포넌트로 외형 바꾸기
- `docs/custom-code.md` 스크립트/CSS 주입, 페이지별 SEO 덮어쓰기
- `docs/deployment.md` Vercel 배포, DNS(Cloudflare/Route 53), 도메인 이전과 ISR 캐시 전략
- `docs/architecture.md` 설정이 흐르는 길(site.config.ts → loadSiteConfig → PageProps.config → useSiteConfig)과 패키지 경계
- `docs/admin-deploy.md` 배포 어드민의 동작과 보안 설계, 관련 코드 위치
- `docs/cloudflare-migration.md` Workers 이전 실측과 접은 이유
- `docs/feature-parity.md` 상용 서비스 기능 대조표
- `docs/competitor-feature-research.md` 유사 서비스 기능 조사
