#!/usr/bin/env bash
# One-off operations on a running server, with the same secrets and networks as the stack.
#
#   deploy/ops.sh <staging|production> <command> [args]
#
#   search-init       create the scoped Meilisearch keys and indexes (prints MEILI_SEARCH_KEY and
#                     MEILI_INDEX_KEY: store them in SSM, then redeploy)
#   reindex           rebuild the search indexes from PostgreSQL
#   create-admin ...  create an admin account (pass --help for its options)
#   status            container status
#   logs <service>    the last 200 log lines of a service
#
# The current release's images are used (the tag in /var/lib/supporters/current-tag).
set -Eeuo pipefail

DEPLOY_ENV=${1:?usage: ops.sh <staging|production> <command> [args]}
COMMAND=${2:?usage: ops.sh <staging|production> <command> [args]}
shift 2

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && { pwd -W 2>/dev/null || pwd; })
# shellcheck source=deploy/load-env.sh
. "$HERE/load-env.sh"
load_env "$DEPLOY_ENV"
resolve_images "$(cat "${STATE_DIR:-/var/lib/supporters}/current-tag")"

compose() { docker compose -f "$HERE/compose.prod.yml" "$@"; }

case "$COMMAND" in
  status) compose ps ;;
  logs) compose logs --no-color --tail 200 "${1:?service name}" ;;
  search-init)
    # Only this command gets the master key; the API and worker never see it.
    compose run --rm --no-deps -e MEILI_MASTER_KEY -e MEILI_URL=http://meilisearch:7700 --entrypoint node api dist/scripts/init-search.js
    ;;
  reindex) compose run --rm --no-deps --entrypoint node api dist/scripts/reindex-search.js ;;
  create-admin) compose run --rm --no-deps -it --entrypoint node api dist/scripts/create-admin.js "$@" ;;
  *) echo "unknown command: $COMMAND" >&2; exit 64 ;;
esac
