# Changesets

`@folionote/core`의 버전과 CHANGELOG를 여기서 관리한다.

패키지를 고쳤으면 `pnpm changeset`을 실행해 변경 내용을 적는다. 그 결과로 생기는
마크다운 파일을 커밋하면, main에 머지될 때 GitHub Actions가 버전 올리는 PR을
열어 준다. 그 PR을 머지하면 npm에 발행된다 (@see .github/workflows/release.yml).

루트 앱(`folionote`)은 npm에 올리지 않으므로 `ignore`에 넣었다.
