#!/usr/bin/env bash
#
# 프로덕션 빌드 미리보기 서버를 재시작한다.
#
# dev 서버(`pnpm dev`)는 요청마다 getStaticProps를 다시 실행해서 Notion을
# 재조회하므로 페이지 한 장에 60초 넘게 걸린다. 시각 확인을 반복할 때는
# 빌드 후 `next start`가 훨씬 빠르다(ISR 캐시로 수십 ms).
#
# `pkill -f "next start"`로는 안 죽는다. 실행 중 프로세스 이름이 `next-server`라
# 패턴이 안 맞고, 그러면 이전 서버가 포트를 계속 잡은 채 옛 빌드를 서빙해서
# HTML이 존재하지 않는 CSS 해시를 가리키는 무스타일 페이지가 나온다.
# 그래서 포트 점유 프로세스를 직접 찾아 죽인다.
#
# 사용법: ./scripts/preview.sh [port]   (기본 3001)

set -euo pipefail

PORT="${1:-3001}"
cd "$(dirname "$0")/.."

echo "==> :$PORT 점유 프로세스 정리"
pids=$(lsof -t -nP -iTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)
if [ -n "$pids" ]; then
  echo "    kill $pids"
  kill -9 $pids 2>/dev/null || true
  # 포트가 풀릴 때까지 대기 (kill 직후엔 아직 LISTEN일 수 있다)
  for _ in $(seq 1 20); do
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
    sleep 0.5
  done
fi

echo "==> build"
pnpm build

echo "==> start on :$PORT"
nohup pnpm start -p "$PORT" >/tmp/folio-preview-"$PORT".log 2>&1 &

for _ in $(seq 1 40); do
  if curl -fsS --max-time 5 -o /dev/null "http://localhost:$PORT/"; then
    break
  fi
  sleep 0.5
done

# HTML이 참조하는 CSS와 빌드 산출물이 어긋나면 옛 서버가 남아 있다는 신호다
html_css=$(curl -fsS "http://localhost:$PORT/" | grep -o 'css/[a-z0-9]*\.css' | head -1 | cut -d/ -f2)
if [ -n "$html_css" ] && [ ! -f ".next/static/css/$html_css" ]; then
  echo "!! HTML이 없는 CSS($html_css)를 참조한다 — 옛 서버가 살아 있다" >&2
  exit 1
fi

echo "==> ready: http://localhost:$PORT/  (css: $html_css)"
