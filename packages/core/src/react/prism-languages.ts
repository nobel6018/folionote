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
 * `import './prism-languages'`처럼 부수 효과만 노리는 import는 쓰지 않는다.
 * package.json의 `sideEffects`가 CSS만 부수 효과로 선언하고 있어서, 바인딩 없는
 * import는 번들러가 통째로 지운다. 값을 가져다 쓰면 지워지지 않는다.
 *
 * 파일 맨 위의 `import 'prismjs'`가 평가 순서를 잡아 두므로, 여기서 다시 꺼내 써도
 * 언어 파일보다 core가 먼저 돈다.
 */
export { default as Prism } from 'prismjs'
