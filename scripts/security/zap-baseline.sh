#!/usr/bin/env bash
# OWASP ZAP baseline (passive) scan of the LOCAL stack. Never point it at anything remote.
#
#   scripts/security/zap-baseline.sh api          # http://localhost:3001 (the Fastify API)
#   scripts/security/zap-baseline.sh web          # http://localhost:3000 (Next.js)
#
# The stack must already be running (docs/security/dast.md has the commands). The baseline scan
# only spiders and passively inspects responses; it sends no attack payloads. Reports land in
# ./zap-reports/ (gitignored). Needs Docker.
set -euo pipefail

# Pinned by digest (ghcr.io/zaproxy/zaproxy:stable). Bump deliberately and re-run the scan.
ZAP_IMAGE="ghcr.io/zaproxy/zaproxy@sha256:9624669db72f54d86c4b46a7064518bd9bf79d8c61a4c31befa9923489f328af"

which="${1:-}"
case "$which" in
  api) port=3001; spec_hint="/v1/categories" ;;
  web) port=3000; spec_hint="/" ;;
  *) echo "usage: $0 api|web" >&2; exit 2 ;;
esac

# Hard guard: only loopback targets. A scan of someone else's server is an attack.
target="${ZAP_TARGET:-http://localhost:${port}}"
if [[ ! "$target" =~ ^http://(localhost|127\.0\.0\.1|host\.docker\.internal)(:[0-9]+)?(/|$) ]]; then
  echo "refusing to scan '$target': only localhost targets are allowed" >&2
  exit 2
fi

if ! curl -fsS -o /dev/null --max-time 5 "http://localhost:${port}${spec_hint}"; then
  echo "nothing answering on localhost:${port}; start the stack first (docs/security/dast.md)" >&2
  exit 1
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
reports="$root/zap-reports"
mkdir -p "$reports"

# From inside the container, "localhost" is the container. Linux can share the host network;
# Docker Desktop (Windows/macOS) reaches the host as host.docker.internal.
net=()
scan_target="$target"
if [[ "$(uname -s)" == "Linux" ]]; then
  net=(--network host)
else
  scan_target="${target/localhost/host.docker.internal}"
  scan_target="${scan_target/127.0.0.1/host.docker.internal}"
fi

# -I: do not fail the run on warnings; the report is the output. Rules: .zap/rules.tsv.
MSYS_NO_PATHCONV=1 docker run --rm "${net[@]}" \
  -v "$root/.zap:/zap/wrk/.zap:ro" \
  -v "$reports:/zap/wrk:rw" \
  "$ZAP_IMAGE" zap-baseline.py \
    -t "$scan_target" \
    -c .zap/rules.tsv \
    -r "zap-${which}.html" -J "zap-${which}.json" -w "zap-${which}.md" \
    -I

echo "reports: $reports/zap-${which}.{html,json,md}"
