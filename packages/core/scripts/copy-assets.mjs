/**
 * tsc는 `.css`를 만지지 않는다. CSS 모듈은 컴포넌트 옆에 있어야 `import styles from
 * './Foo.module.css'`가 dist에서도 맞으므로, 상대 경로를 유지한 채 그대로 복사한다.
 *
 * 번들러로 말아넣지 않는 이유는 README의 "왜 tsc만 쓰는가"에 있다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const srcDir = path.join(packageDir, 'src')
const distDir = path.join(packageDir, 'dist')

let copied = 0

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const from = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(from)
      continue
    }
    if (!entry.name.endsWith('.css')) continue

    const to = path.join(distDir, path.relative(srcDir, from))
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
    copied++
  }
}

if (!fs.existsSync(distDir)) {
  throw new Error('dist가 없다. tsc를 먼저 돌려야 한다')
}

walk(srcDir)
console.log(`copy-assets: css ${copied}개 복사`)
