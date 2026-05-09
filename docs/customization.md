# Customization

folionote의 시각 디자인을 자기 사이트에 맞게 변경하는 가이드.

## 디자인 토큰 (가장 빠른 길)

`styles/folio-tokens.css`에 모든 색/간격/폰트 토큰이 CSS variables로 정의돼 있음.
파일 1개만 수정하면 사이트 전체 톤 변경.

### Brand 색
```css
:root {
  --folio-brand-primary: #2e3439;   /* 기본 텍스트/포인트 */
  --folio-brand-accent: #77a4fe;    /* selection, 호버 */
}
```

### 본문 폰트 변경
1. 새 폰트 추가 — `styles/fonts.css` 수정 또는 `_app.tsx`에 `import` 추가
2. `styles/folio-tokens.css`에서 `--folio-font-sans` 갱신
   ```css
   --folio-font-sans: 'Your Font', -apple-system, sans-serif;
   ```

### Light/Dark 색
- light는 `:root`에서 정의
- dark는 `.dark-mode { ... }`에서 override
- 다크모드는 `next-themes`가 `<html>` element에 클래스 부여 (3-state: system/light/dark, localStorage 저장)

### 레이아웃
- `--folio-content-max-width` (708px) — 본문 텍스트 최대 폭
- `--folio-page-max-width` (900px) — 페이지 컨테이너
- `--folio-page-cover-height` (30vh / 200px) — 커버 이미지 높이
- 미디어 쿼리(480px / 780px)에서 mobile fallback 정의

## react-notion-x 클래스 직접 override

`styles/folio-overrides.css`에서 `.notion-*` 클래스에 레퍼런스 서비스 풍 시각 적용. 필요한 부분 수정:
- `.notion-callout`, `.notion-bookmark` 등 블록별 스타일
- `.notion-page-cover-wrapper` — 커버 이미지 풀폭
- `.notion-page-icon-hero` — 페이지 아이콘 좌측 정렬 + 사각형

## 자체 React 컴포넌트로 교체

`components/NotionPage.tsx`의 `components` 객체에 customComponents 주입:

```tsx
import { MyCallout } from './folio/MyCallout'

const components = React.useMemo<Partial<NotionComponents>>(() => ({
  Code: FolioCode,
  Callout: MyCallout,   // ← 자체 구현 추가
  // ...
}), [])
```

react-notion-x가 customizable한 컴포넌트:
- `Code`, `Callout`, `Equation`, `Pdf`, `Modal`, `Tweet`, `Header`, `Image`, `Link`
- `Bookmark`는 *customizable 아님* — CSS만 활용

## 폰트 추가 임베드

```css
/* styles/fonts.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
```

또는 self-host로 더 빠른 로딩:
```css
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/MyFont-Regular.woff2') format('woff2');
  font-display: swap;
}
```

## 분석/도구

- 디자인 분석 결과: `analysis/design-tokens.md` (레퍼런스 서비스 색/타이포 토큰 추출)
- HTML 구조: `analysis/html-structure.md` (블록별 마크업)
- 클래스 매핑: `analysis/class-mapping.md` (레퍼런스 서비스 ↔ react-notion-x)
