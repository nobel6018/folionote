---
'@folionote/core': patch
---

Notion 429를 안내 화면으로 바꾸지 않고 예외로 던진다. ISR 재생성 중 429가 나면 정상 캐시가 HTTP 200 오류 화면으로 덮이던 문제를 고친다. `PageErrorKind`에서 `rate-limited`를 뺀다.
