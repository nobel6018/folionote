---
'@folionote/core': patch
---

미리보기 이미지(LQIP)를 만들 때 Notion 이미지 프록시에 브라우저 User-Agent를 보낸다. 없으면 `www.notion.so/image/...`가 403을 줘서 Notion에 올린 이미지와 Notion이 감싼 외부 이미지의 흐린 미리보기가 모두 빠졌다.
