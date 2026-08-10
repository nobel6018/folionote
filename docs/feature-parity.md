# 레퍼런스 서비스 기능 대조표

레퍼런스 서비스 어드민 콘솔(상용 서비스 어드민)의 설정 화면을 기준으로 folionote의 구현 범위를 정리했다.
레퍼런스 서비스가 무엇을 팔고 있는지가 그대로 드러나므로, 로드맵의 기준선으로 쓴다.

측정 대상 사이트는 레퍼런스 사이트 (Legacy 플랜). PRO 전용 기능은 표에 따로 표시했다.

## 어드민이 확인해준 실측값

렌더링 결과를 재서 맞춰 놓은 값들이 어드민 설정과 일치했다. 추측이 아니라는 확인이다.

| 항목 | 어드민 값 | folionote 토큰 |
|---|---|---|
| 모서리 둥글게 - 갤러리 및 보드 | 4 | `--folio-radius-md: 4px` |
| 모서리 둥글게 - 이미지 | 0 | 커버 `border-radius: 0` |
| 모서리 둥글게 - 콜아웃 | 4 | `--folio-radius-md` |
| 페이지 너비 | 900 | `--folio-page-max-width: 900px` |
| 상단 메뉴 높이 | 48 | `--folio-nav-row-height: 48px` |
| 스크롤 시 블러 효과 | OFF | `backdrop-filter: none` |
| 마우스 오버 효과 색상 | `#669DFD` | `--folio-brand-accent` |

어드민의 "폰트 크기 16"은 예외다. 실제 nav 링크는 14px/700으로 렌더된다.
어드민 라벨보다 실측을 따랐다.

## 홈 (사이트 기본)

| 레퍼런스 서비스 설정 | folionote | 메모 |
|---|---|---|
| 호스트네임 | O | `site.config.ts` `domain` |
| 연결된 Notion 주소 | O | `rootNotionPageId` |
| 호스트네임 플랜 | 해당 없음 | SaaS 과금 개념 |
| 리다이렉트 주소 | X | Vercel 도메인 설정으로 대체 |
| 로고 (favicon) | 수동 | `public/` 파일 교체 |
| 공유 이미지 (og:image) | 부분 | `defaultPageCover` + 페이지 `Social Image` 속성 |
| 노션 커버를 og:image로 덮어쓰기 | O | 블록 커버를 우선 사용 (`PageHead`) |
| 검색 엔진 허용 (robots.txt) | 토글 없음 | 항상 허용 (`pages/robots.txt.tsx`) |
| 사이트맵 (sitemap.xml) | 토글 없음 | 항상 생성 (`pages/sitemap.xml.tsx`) |

## 스타일 > 기본 스타일

| 레퍼런스 서비스 설정 | folionote | 메모 |
|---|---|---|
| 색상 테마 라이트 / 다크 | O | 3-state (system 포함) |
| 색상 테마 커스텀 (배경 + 폰트 색) | X | 어드민은 `#CCDDFF` / `#3C3C3C` 처럼 직접 지정 |
| 테마 선택 버튼 표시 | O | |
| 공유 버튼 표시 | X | |
| 검색 버튼 표시 | O | `isSearchEnabled` |
| 페이지 경로 표시 | 토글 없음 | 항상 표시 |
| 복제 버튼 표시 | X | |
| 모서리 둥글게 (갤러리 / 이미지 / 콜아웃) | 고정값 | 토큰 수정으로 변경, 슬라이더는 없음 |
| 페이지 너비 | 고정값 | `--folio-page-max-width` |
| 계절별 특수 효과 | X | 눈, 벚꽃 등 |
| 스크롤 프로그레스 바 | X | 어드민 기본색 `#007FB8` |
| 페이지 맨 위로 버튼 | X | 위치, 여백까지 설정 가능 |
| 페이지뷰 카운트 | X | 집계 저장소가 필요해 OSS로는 부담 |
| 글 복사 방지 | X | |
| 레퍼런스 서비스 로고 숨기기 | 해당 없음 | |

## 스타일 > 폰트

레퍼런스 서비스는 Ko / En / Ja를 따로 지정한다. 한국어 17종 이상을 임베드해서 제공한다
(TmoneyRoundWind, Noto Sans KR, Gothic A1, Nanum Gothic, Nanum Myeongjo,
NEXON Lv1 Gothic, NanumSquare, NanumSquareRound, S-CoreDream, Arita-dotum,
Chosunilbo_myungjo, GyeonggiBatang, Cafe24Oneprettynight, Spoqa Han Sans,
RIDIBatang, Gmarket Sans, DungGeunMo 등).

folionote는 Pretendard 한 종을 `--folio-font-sans`로 고정한다. 사용자가 토큰을
바꿔 쓸 수는 있지만 폰트 목록과 언어별 분리는 없다.

## 스타일 > 데이터베이스

이 탭이 최근 작업한 컬렉션 렌더링과 그대로 대응한다.

| 레퍼런스 서비스 설정 | folionote | 메모 |
|---|---|---|
| 검색 기능 숨기기 | X | 컬렉션 내 검색 자체가 없다. react-notion-x 미제공 |
| 페이지 내 데이터베이스 속성 숨기기 | 토글 없음 | 항상 2열로 표시 |
| 원본 데이터베이스로의 링크 비활성화 | X | |
| 데이터베이스 뷰 목록 숨기기 | O | `isCollectionViewTabsEnabled` |
| 페이지 경로에서 데이터베이스 페이지 숨기기 | 토글 없음 | 항상 크럼에 넣는다 (`components/folio/Breadcrumbs.tsx`) |

## 스타일 > 상단 메뉴바

| 레퍼런스 서비스 설정 | folionote | 메모 |
|---|---|---|
| 좌측 로고 이미지 (테마별) | X | 사이트 이름 텍스트만 |
| 로고 크기 | X | |
| 로고 클릭 시 이동 URL | 고정 | 항상 `/` |
| 상단 메뉴 높이 | O | `--folio-nav-row-height` |
| 마우스 오버 효과 (텍스트 / 색상) | O | `--folio-nav-hover-color` |
| 스크롤 시 상단 고정 | O | sticky |
| 스크롤 시 블러 효과 | 고정 OFF | |
| 메뉴 목록 (최대 5개) | O | `navigationLinks` |
| 모바일에서 메뉴 미리보기 | X | |
| 서브메뉴 (PRO) | X | |

## 미구현 탭

- **하단 네비게이터** (PRO): 모바일 하단 탭바. 메뉴 최대 5개 + 색상
- **CTA 버튼**: 떠 있는 버튼. 내용, 링크, 하단 공백, 단일/그라데이션 색, 클릭 이벤트 측정
- **팝업 설정**: 팝업 최대 3개(PRO는 더 많이), "메인 페이지만 보이기"

## 우선순위 판단

구현 난이도와 레퍼런스 사이트 재현 기여도를 같이 본 순서다.

1. **컬렉션 내 검색** - leedo 화면에 실제로 보이는데 없는 유일한 요소. 클라이언트에서
   `collection_query` 결과를 필터링하면 되므로 서버가 필요 없다.
2. **커스텀 색상 테마** - 배경/글자색 2개를 토큰에 주입하면 끝난다. 레퍼런스 서비스가 파는
   커스터마이징의 핵심이라 OSS 가치가 크다.
3. **스크롤 프로그레스 바, 맨 위로 버튼** - 순수 클라이언트 위젯. 구현이 싸다.
4. **상단 로고 이미지** - 텍스트 대신 이미지. 테마별 2장.
5. **폰트 선택** - 목록을 늘리는 건 쉽지만 웹폰트 용량과 라이선스를 따져야 한다.
6. **CTA 버튼, 팝업, 하단 네비게이터** - 마케팅 기능. 블로그 재현에는 기여가 없다.
7. **페이지뷰 카운트** - 집계 저장소가 필요해 "정적 사이트" 전제와 충돌한다. 보류.
