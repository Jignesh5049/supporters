#!/usr/bin/env bash
# Starts or stops the local stack the ZAP scan runs against: the infrastructure containers from
# apps/api/docker-compose.yml, then the API (:3001) and the web app (:3000) as background
# processes. Local only; every credential below is a throwaway.
#
#   scripts/security/dast-stack.sh up
#   scripts/security/dast-stack.sh down
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
state="$root/.dast-stack"   # pid files and logs (gitignored)
api="$root/apps/api"
web="$root/apps/web"

pnpm_cmd() { pnpm "$@"; }

case "${1:-}" in
  up)
    mkdir -p "$state"
    (cd "$api" && docker compose up -d --wait)
    cd "$api"
    [[ -f .env ]] || cp .env.example .env
    grep -q '^JWT_PRIVATE_KEY=' .env || pnpm_cmd --silent keys:generate >> .env
    grep -q '^MEILI_SEARCH_KEY=' .env || MEILI_MASTER_KEY=meili-local-master-key pnpm_cmd --silent search:init >> .env
    pnpm_cmd db:deploy
    pnpm_cmd db:seed
    pnpm_cmd storage:init

    node --env-file=.env --import tsx src/server.ts > "$state/api.log" 2>&1 &
    echo $! > "$state/api.pid"

    cd "$web"
    LOCAL_API_PROXY=1 pnpm_cmd exec next build > "$state/web-build.log" 2>&1
    APP_ORIGIN=http://localhost:3000 pnpm_cmd exec next start > "$state/web.log" 2>&1 &
    echo $! > "$state/web.pid"

    for url in http://localhost:3001/health http://localhost:3000/login; do
      for _ in $(seq 1 60); do
        curl -fsS -o /dev/null "$url" && break
        sleep 2
      done
      curl -fsS -o /dev/null "$url" || { echo "$url did not come up; see $state" >&2; exit 1; }
    done
    echo "stack is up: API :3001, web :3000"
    ;;
  down)
    for name in api web; do
      if [[ -f "$state/$name.pid" ]]; then
        kill "$(cat "$state/$name.pid")" 2>/dev/null || true
        rm -f "$state/$name.pid"
      fi
    done
    (cd "$api" && docker compose down)
    ;;
  *)
    echo "usage: $0 up|down" >&2
    exit 2
    ;;
esac
