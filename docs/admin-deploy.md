# 배포된 사이트에서 설정 화면 쓰기

`/admin`은 두 모드로 동작합니다. 로컬 개발 서버에서는 예전처럼 인증 없이 파일을
직접 고치고, 배포된 사이트에서는 GitHub 로그인을 거쳐 리포에 커밋합니다.

기본값은 꺼짐입니다. 필요한 환경변수를 넣지 않으면 `/admin`과 관련 API가 전부
404를 돌려줍니다. 아무 생각 없이 포크해서 배포한 사람이 열린 어드민을 갖게 되는
일은 없습니다.

## 왜 파일을 쓰지 않고 커밋하는가

배포 환경에서 `site.config.ts`에 파일을 쓰는 방식은 두 군데서 막힙니다.

서버리스 파일시스템은 `/tmp` 말고는 읽기 전용이라 쓰기가 실패합니다. 설령 썼다
쳐도 `site.config.ts`는 빌드 타임에 번들로 들어가는 모듈이라, 이미 빌드된 함수가
그 파일을 다시 읽지 않습니다. 반영하려면 어차피 재빌드가 필요합니다.

그래서 저장을 커밋으로 바꿨습니다. 커밋이 곧 배포 트리거이고, 변경 이력과 롤백은
git이 맡습니다. 설정을 담을 별도 저장소도, 사용자 목록을 담을 DB도 생기지
않습니다. 되돌리려면 `git revert` 하나면 됩니다.

Keystatic과 Decap CMS(구 Netlify CMS)가 같은 구조를 씁니다.

## 인가 규칙

"이 리포에 푸시할 수 있는가" 하나로 판정합니다 (`lib/admin/github.ts`의
`canPush`). 허용할 계정 목록을 따로 관리하지 않습니다.

어차피 저장이 곧 커밋이라 푸시 권한이 없으면 저장도 실패합니다. 권한의 출처를
리포 하나로 두면 관리할 목록이 생기지 않고, 협업자를 추가·제거하는 곳도 GitHub
한 군데로 유지됩니다.

## 설정 방법

### 1. GitHub OAuth 앱 만들기

<https://github.com/settings/developers> 에서 New OAuth App을 누릅니다.

| 항목 | 값 |
|---|---|
| Homepage URL | `https://내도메인` |
| Authorization callback URL | `https://내도메인/api/admin/auth/callback` |

Client ID와 Client secret을 받아둡니다.

### 2. 환경변수 넣기

Vercel 프로젝트 설정의 Environment Variables에 넣습니다.

| 변수 | 필수 | 설명 |
|---|---|---|
| `GITHUB_OAUTH_CLIENT_ID` | O | OAuth 앱의 Client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | O | OAuth 앱의 Client secret |
| `ADMIN_SESSION_SECRET` | O | 세션 쿠키 암호화 키. `openssl rand -base64 32`로 만듭니다 |
| `GITHUB_REPO` | 조건부 | `owner/repo`. Vercel에서는 자동으로 잡히므로 생략합니다 |
| `GITHUB_BRANCH` | X | 커밋할 브랜치. 기본은 현재 배포 브랜치 |
| `ADMIN_CONFIG_PATH` | X | 설정 파일 경로. 기본 `site.config.ts` |

Vercel은 git 연동 프로젝트에 `VERCEL_GIT_REPO_OWNER`와 `VERCEL_GIT_REPO_SLUG`를
넣어줍니다. 그래서 Vercel에 올렸다면 위의 셋만 넣으면 됩니다. 다른 호스트에서는
`GITHUB_REPO`를 직접 줍니다.

### 3. 재배포

환경변수는 빌드 시점에 잡히므로 넣은 뒤 한 번 재배포해야 합니다.

## 쓰는 흐름

`/admin`에 들어가면 로그인 화면이 나옵니다. GitHub으로 로그인하면 리포 푸시 권한을
확인하고, 통과하면 설정 화면이 열립니다. 저장을 누르면 커밋이 만들어지고 커밋
링크가 하단에 뜹니다. Vercel이 재빌드를 끝내면 사이트에 반영됩니다.

재빌드에 1~3분이 걸리므로 오른쪽 미리보기는 잠시 이전 상태로 남습니다. 배포 모드는
가끔 고치는 용도이고, 빠르게 이것저것 바꿔보려면 로컬에서 `pnpm dev`로 띄운 뒤
`/admin`을 쓰는 편이 낫습니다. 로컬은 저장하는 즉시 반영됩니다.

## 보안에서 짚은 것

**미인증에는 404를 줍니다.** OSS라 경로가 이미 알려져 있으니 401로 "여기 있긴
하다"를 확인시켜 줄 이유가 없습니다. `/admin` 화면은 어드민이 켜진 경우에만
로그인 화면을 보여줍니다.

**세션은 암호화합니다.** 서버리스에는 세션을 담아둘 곳이 없어서 GitHub 토큰을
쿠키에 넣어 다닙니다. 서명만 하면 쿠키를 읽는 쪽이 토큰을 그대로 가져가므로
AES-256-GCM으로 암호화합니다. GCM은 암호화와 무결성 검증을 같이 해서 위조된
쿠키는 복호화 단계에서 걸립니다. 쿠키는 HttpOnly, SameSite=Lax, https에서는
Secure이고 8시간 뒤 만료됩니다. 만료는 서버에서도 다시 확인합니다. 브라우저가
지키는 `Max-Age`만 믿지 않습니다.

**로그인 CSRF를 막습니다.** 로그인을 시작할 때 만든 `state`를 쿠키에 넣고 같은
값을 GitHub에 넘긴 뒤, 콜백에서 두 값을 타이밍 세이프로 비교합니다.

**변경 요청의 Origin을 확인합니다.** 세션 쿠키가 SameSite=Lax라 크로스 사이트
POST에는 실리지 않지만, 서버에서 한 번 더 봅니다. 방어를 한 겹에 기대지 않습니다.

**동시 수정을 덮어쓰지 않습니다.** 커밋할 때 현재 파일의 sha를 함께 넘깁니다.
그 사이 다른 곳에서 같은 파일이 바뀌었으면 GitHub이 409를 주고, 화면은 새로고침
후 다시 저장하라고 안내합니다.

**토큰 스코프는 `repo`입니다.** `public_repo`로는 비공개 리포에 커밋할 수 없고
개인 블로그 리포가 비공개인 경우가 흔합니다. 이 토큰은 사용자 브라우저 쿠키
안에서만 살고 서버에 저장하지 않습니다.

## 관련 코드

| 파일 | 역할 |
|---|---|
| `lib/admin/env.ts` | 환경변수 해석, 어드민 켜짐 판정 |
| `lib/admin/session.ts` | 세션 쿠키 암호화·복호화, state 쿠키 |
| `lib/admin/github.ts` | OAuth 교환, 푸시 권한 확인, 커밋 |
| `lib/admin/request.ts` | 세션 읽기, Origin 확인 |
| `pages/api/admin/auth/login.ts` | OAuth 시작 |
| `pages/api/admin/auth/callback.ts` | OAuth 콜백, 인가, 세션 발급 |
| `pages/api/admin/auth/logout.ts` | 세션 쿠키 삭제 |
| `pages/api/admin/config.ts` | 설정 읽기, 로컬 저장 또는 커밋 |
| `pages/admin.tsx` | 설정 화면, 로그인 화면 |
