// Prism core가 먼저 평가돼야 한다. 아래 언어 파일들은 전역 `Prism`에 문법을 등록하는
// 스크립트라서, core보다 먼저 돌면 참조할 대상이 없다. 그래서 이 줄이 맨 위에 있다.
import 'prismjs'
// 코드 블록에 쓰는 언어를 정적으로 등록한다. dynamic import로 미루면 SSR 시점에
// 문법이 없어 하이라이트 없는 HTML이 먼저 나간다. 언어를 늘리려면 여기에 줄을 더한다.
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-coffeescript'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-docker'
import 'prismjs/components/prism-git'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-graphql'
import 'prismjs/components/prism-handlebars'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-js-templates'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-less'
import 'prismjs/components/prism-makefile'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-objectivec'
import 'prismjs/components/prism-ocaml'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-reason'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sass'
import 'prismjs/components/prism-scss'
import 'prismjs/components/prism-solidity'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-stylus'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-wasm'
import 'prismjs/components/prism-yaml'

/**
 * 언어가 등록된 Prism.
 *
 * 이 파일은 package.json `sideEffects`에 이름을 올려 두어야 한다. 빠지면 번들러가
 * 이 파일을 "부수 효과 없는 중계"로 보고, `Prism`을 가져가는 쪽을 `prismjs`로
 * 곧장 이어 버린다. 그러면 위의 언어 import가 한 번도 실행되지 않아 모든 코드 블록이
 * 강조 없이 나간다. 값을 꺼내 쓰는 것만으로는 막히지 않았다(프로덕션 빌드에서
 * `.token`이 0개였다).
 *
 * 파일 맨 위의 `import 'prismjs'`가 평가 순서를 잡아 두므로, 여기서 다시 꺼내 써도
 * 언어 파일보다 core가 먼저 돈다.
 */
export { default as Prism } from 'prismjs'
