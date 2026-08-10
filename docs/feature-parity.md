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
| 색상 테마 라이트 / 다크 | O | `colorTheme.mode`. 기본 `system`(3-state) |
| 색상 테마 커스텀 (배경 + 폰트 색) | O | `colorTheme: { mode: 'custom', background, foreground }` |
| 테마 선택 버튼 표시 | O | 테마를 고정하거나 custom을 쓰면 자동으로 감춘다 |
| 공유 버튼 표시 | O | `isShareButtonEnabled`. 헤더 + 모바일 드로어 |
| 검색 버튼 표시 | O | `isSearchEnabled` |
| 페이지 경로 표시 | 토글 없음 | 항상 표시 |
| 복제 버튼 표시 | X | |
| 모서리 둥글게 (갤러리 / 이미지 / 콜아웃) | 고정값 | 토큰 수정으로 변경, 슬라이더는 없음 |
| 페이지 너비 | 고정값 | `--folio-page-max-width` |
| 계절별 특수 효과 | X | 눈, 벚꽃 등 |
| 스크롤 프로그레스 바 | O | `scrollProgressBar`. 기본색 `#007FB8` (어드민과 동일) |
| 페이지 맨 위로 버튼 | O | `backToTop`. 좌우 위치, 여백, 화면 너비에 맞추기 지원 |
| 페이지뷰 카운트 | X | 집계 저장소가 필요해 OSS로는 부담 |
| 글 복사 방지 | X | |
| 레퍼런스 서비스 로고 숨기기 | 해당 없음 | |

## 스타일 > 폰트

레퍼런스 서비스는 Ko / En / Ja를 따로 지정하고 한국어 17종 이상을 자체 CDN에서 제공한다
(TmoneyRoundWind, Noto Sans KR, Gothic A1, Nanum Gothic, Nanum Myeongjo,
NEXON Lv1 Gothic, NanumSquare, NanumSquareRound, S-CoreDream, Arita-dotum,
Chosunilbo_myungjo, GyeonggiBatang, Cafe24Oneprettynight, Spoqa Han Sans,
RIDIBatang, Gmarket Sans, DungGeunMo 등).

folionote도 `font: { ko, en, ja }`로 언어별 지정을 받는다. 세 폰트를 font-family
스택으로 합치면 브라우저가 글자마다 그 글자를 가진 폰트를 골라 쓴다.

| 항목 | 상태 | 메모 |
|---|---|---|
| 언어별(Ko/En/Ja) 지정 | O | `font.ko` / `font.en` / `font.ja` |
| 폰트 목록 제공 | 부분 | `lib/fonts.ts`에 22종. OFL/Apache로 CDN 배포가 명확한 것만 |
| 고정폭 폰트 | O | `font.mono` |

레퍼런스 서비스 목록 중 TmoneyRoundWind, NanumSquare, S-CoreDream, Gmarket Sans, RIDIBatang
등은 상업적 이용은 무료지만 재배포 조건이 제각각이라 OSS 기본 레지스트리에
넣지 않았다. 쓰려면 `{ family, url }`로 직접 지정한다.

선택한 폰트만 받는다. `styles/fonts.css`에 `@import`로 박아 두면 어떤 폰트를
고르든 Pretendard까지 항상 함께 내려받게 되므로, 설정을 보고 `<link>`로 넣는다.

## 스타일 > 데이터베이스

이 탭이 최근 작업한 컬렉션 렌더링과 그대로 대응한다.

| 레퍼런스 서비스 설정 | folionote | 메모 |
|---|---|---|
| 검색 기능 숨기기 | O | `isCollectionSearchEnabled` (`components/folio/CollectionSearch.tsx`) |
| 페이지 내 데이터베이스 속성 숨기기 | 토글 없음 | 항상 2열로 표시 |
| 원본 데이터베이스로의 링크 비활성화 | X | |
| 데이터베이스 뷰 목록 숨기기 | O | `isCollectionViewTabsEnabled` |
| 페이지 경로에서 데이터베이스 페이지 숨기기 | 토글 없음 | 항상 크럼에 넣는다 (`components/folio/Breadcrumbs.tsx`) |

컬렉션 내 검색은 레퍼런스 서비스와 같게 제목뿐 아니라 태그, 날짜까지 매칭한다. leedo에서
"Kotlin"을 넣으면 제목에 Kotlin이 없는 "BFF GraphQL N+1 호출 개선"이 태그로
잡히는 것을 확인하고 같은 동작으로 맞췄다.

recordMap을 걸러 react-notion-x에 넘기는 대신 렌더된 항목에 클래스를 붙여 감춘다.
키 입력마다 recordMap을 깊은 복사해 컬렉션 전체를 다시 렌더하는 비용이 정적
사이트에서 카드 100여 장을 거르는 값으로는 과하고, react-notion-x 내부 구조에
의존하게 된다. 뷰를 바꿔 항목이 새로 붙어도 필터가 유지되도록 MutationObserver로
다시 적용한다.

## 스타일 > 상단 메뉴바

| 레퍼런스 서비스 설정 | folionote | 메모 |
|---|---|---|
| 좌측 로고 이미지 (테마별) | O | `logo.light` / `logo.dark`. 없으면 사이트 이름 텍스트 |
| 로고 크기 | O | `logo.height` |
| 로고 클릭 시 이동 URL | O | `logo.href` |
| 상단 메뉴 높이 | O | `--folio-nav-row-height` |
| 마우스 오버 효과 (텍스트 / 색상) | O | `--folio-nav-hover-color` |
| 스크롤 시 상단 고정 | O | sticky |
| 스크롤 시 블러 효과 | 고정 OFF | |
| 메뉴 목록 (최대 5개) | O | `navigationLinks`, 개수 제한 없음 |
| 모바일 메뉴 | O | 780px 이하에서 햄버거 + 우측 사이드 드로어 |
| 서브메뉴 (PRO) | X | |

## 스타일 > CTA 버튼

| 레퍼런스 서비스 설정 | folionote | 메모 |
|---|---|---|
| 버튼 내용 / 링크 | O | `cta.text` / `cta.href` |
| 하단 공백 | O | `cta.bottomOffset` |
| 색상 단일 / 그라데이션 | O | `cta.background` 또는 `cta.gradient` |
| 글자색 / 그림자색 | O | `cta.color` / `cta.shadowColor` |
| 새 브라우저 탭으로 열기 | O | `cta.newTab` |
| 클릭 이벤트 측정 | 해당 없음 | 붙여 둔 분석 도구가 링크 클릭을 잡는다 |

## 미구현 탭

- **하단 네비게이터** (PRO): 모바일 하단 탭바. 메뉴 최대 5개 + 색상
- **팝업 설정**: 팝업 최대 3개(PRO는 더 많이), "메인 페이지만 보이기"

## 우선순위 판단

구현 난이도와 레퍼런스 사이트 재현 기여도를 같이 본 순서다. 위 두 개는 완료했다.

1. ~~상단 네비게이션 (로고 이미지 + 모바일 드로어)~~ - 완료
2. ~~컬렉션 내 검색~~ - 완료
3. **커스텀 색상 테마** - 배경/글자색 2개를 토큰에 주입하면 끝난다. 레퍼런스 서비스가 파는
   커스터마이징의 핵심이라 OSS 가치가 크다.
4. **공유 버튼** - leedo 모바일 드로어 상단에 있다. Web Share API + 링크 복사로 충분.
5. **스크롤 프로그레스 바, 맨 위로 버튼** - 순수 클라이언트 위젯. 구현이 싸다.
6. **폰트 선택** - 목록을 늘리는 건 쉽지만 웹폰트 용량과 라이선스를 따져야 한다.
7. **CTA 버튼, 팝업, 하단 네비게이터** - 마케팅 기능. 블로그 재현에는 기여가 없다.
8. **페이지뷰 카운트** - 집계 저장소가 필요해 "정적 사이트" 전제와 충돌한다. 보류.
