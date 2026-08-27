# 기여 안내

folionote에 이슈와 풀 리퀘스트를 환영합니다. 이 문서는 로컬에서 돌려 보고 변경을 올리는
절차만 담습니다. 사이트를 배포하는 방법은 [README](README.md)에, 리포의 구조와 함정은
[AGENTS.md](AGENTS.md)에 있습니다.

## 로컬 개발

Node.js 18 이상과 pnpm이 필요합니다.

```bash
gh repo fork nobel6018/folionote --clone
cd folionote
pnpm install
```

렌더할 Notion 페이지를 지정해야 사이트가 뜹니다. 경로가 둘이고, `site.config.ts`에 값이
있으면 파일이 환경변수를 이깁니다(`lib/get-config-value.ts`).

- `.env`에 `NOTION_ROOT_PAGE_ID`와 `SITE_NAME` 두 값만 넣는 방법. 리포 파일을 건드리지
  않으니 upstream과 충돌이 없습니다. `NOTION_ROOT_PAGE_ID`에는 32자 ID 대신 Notion 페이지
  주소를 통째로 넣어도 `parsePageId`가 뽑아냅니다.
- `site.config.ts`의 `rootNotionPageId`, `name`, `domain`, `author`를 채우는 방법. 설정을
  읽는 코드를 고칠 때는 이쪽이 편합니다.

대상 페이지는 Notion에서 "웹에 게시"가 켜져 있어야 합니다. 꺼져 있어도 빌드는 실패하지
않고 안내 화면이 뜨므로(`lib/notion-errors.ts`) 원인 구분은 쉽습니다.

```bash
PORT=3010 pnpm dev
```

포트는 명시합니다. 3000이 이미 쓰이고 있으면 Next가 조용히 다른 포트로 옮겨 붙어, 확인하는
주소와 실제로 뜬 주소가 어긋납니다.

## 검증

올리기 전에 둘을 통과시킵니다.

```bash
pnpm test         # eslint . + prettier --check. CI가 도는 것과 같은 명령입니다
npx tsc --noEmit  # 타입 검사는 pnpm test에 들어 있지 않습니다
```

CI(`.github/workflows/build.yml`)가 실행하는 명령은 `pnpm test` 하나이고, Node 20과 22 두
버전에서 돕니다. 커밋할 때 lint-staged가 `prettier --write`와 `eslint --fix`를 걸어 주므로
서식 실패는 대개 여기서 걸러집니다.

`pnpm build`는 CI에 없습니다. 빌드가 Notion을 실제로 읽어 페이지 수에 따라 수 분이 걸리고,
비공식 API라 짧은 시간에 많이 읽으면 429가 나기 때문입니다. 빌드나 데이터 로딩 경로를
건드린 변경에서만 로컬로 한 번 돌려 보면 됩니다.

## 코드 규칙

전체 규칙은 [AGENTS.md의 "개발할 때 지킬 것"](AGENTS.md#개발할-때-지킬-것)에 있습니다.
기여자가 특히 자주 걸리는 넷만 옮깁니다.

- 주석은 한국어로 "왜"를 씁니다. 코드가 이미 말하는 "무엇"은 반복하지 않습니다.
  `lib/notion.ts`의 후처리 함수들이 이 형식의 실례입니다.
- 본문에 Em dash를 쓰지 않습니다. dash가 필요한 자리에는 `-`를 씁니다.
- 커밋 메시지는 한국어 conventional 형식입니다(`feat(admin): ...`, `fix(dark): ...`,
  `docs: ...`). **본문에는 왜 그렇게 했는지와 무엇으로 검증했는지를 남깁니다.**
  `git log --oneline`에 실례가 많습니다.
- 모바일에서 `input`, `select`, `textarea`의 폰트를 16px 미만으로 두지 않습니다. iOS
  Safari가 포커스할 때 화면을 확대하고 스스로 돌아오지 않습니다.

## 풀 리퀘스트

1. 브랜치를 팝니다. 이름 앞에 커밋 타입을 붙입니다. `fix/notion-crdt-data`,
   `feat/admin-preview`, `docs/contributing` 형태입니다.
2. 커밋은 따로 되돌릴 수 있는 단위로 나눕니다. 문서 수정과 동작 변경을 한 커밋에 섞지
   않습니다.
3. PR 본문에는 무엇을 바꿨는지 대신 왜 바꿨는지와 어떻게 확인했는지를 씁니다. 화면이
   달라지는 변경이면 전후 스크린샷을, 수치가 달라지는 변경이면 전후 수치를 넣습니다.
4. CI가 통과해야 머지합니다. 실패하면 로그의 `eslint`와 `prettier` 출력을 먼저 봅니다.

자기 사이트 값(Notion 페이지 ID, 도메인, 토큰)은 커밋에 넣지 않습니다. 로컬에서
`site.config.ts`를 자기 값으로 바꿔 뒀다면 PR을 올리기 전에 그 부분만 되돌립니다.

## 막혔을 때

- 화면이 갱신되지 않으면 `rm -rf .next` 후 dev 서버를 다시 띄웁니다.
- Notion에서 고친 내용이 안 보이면 대개 ISR 주기 문제입니다. 600초이고, 오류 안내 화면
  상태에서는 30초입니다.
- 그 밖의 함정은 [AGENTS.md의 "함정"](AGENTS.md#함정)에 모여 있습니다.

## 크레딧

[nextjs-notion-starter-kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit)을
기반으로 시작한 프로젝트입니다.
