---
'@folionote/core': patch
---

상세 페이지 커버를 지연 로딩 없이 먼저 받는다. react-notion-x는 프리뷰 이미지가 없는 커버를 `loading="lazy"`로 그려 첫 화면의 가장 큰 요소(LCP)가 늦게 떴다. 커버를 직접 그려 `fetchpriority="high"`와 화면 폭 기준 srcset을 붙인다.
