#!/usr/bin/env bash
# Brings the production stack (compose.prod.yml) up on this machine with fake secrets, plus
# PostgreSQL and MinIO, and checks what a deploy relies on: the origin-secret check, /health,
# /ready, a signup through Caddy, and the web home page. Needs Docker, curl and openssl.
#
#   deploy/smoke.sh                       # builds the four images (~5 min cold), runs, tears down
#   SMOKE_SKIP_BUILD=1 deploy/smoke.sh    # reuse the supporters-*:smoke images from an earlier run
#   SMOKE_KEEP=1 deploy/smoke.sh          # leave the stack running to poke at it
#                                         # (docker compose -p supporters-smoke ps)
#
# The API runs with NODE_ENV=development because staging and production refuse to boot until MSG91
# and a real media processor exist (see deploy/README.md). Everything else is the production wiring.
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

PORT=${SMOKE_PORT:-18443}
TMP=$(mktemp -d)
export COMPOSE_PROJECT_NAME=supporters-smoke
DC=(docker compose -f deploy/compose.prod.yml -f deploy/compose.smoke.yml)
fail() { printf 'SMOKE FAILED: %s\n' "$*" >&2; exit 1; }
pass() { printf '  ok  %s\n' "$*"; }
cleanup() {
  status=$?
  if ((status != 0)); then
    "${DC[@]}" ps -a || true
    "${DC[@]}" logs --no-color --tail 30 || true
  fi
  if [[ "${SMOKE_KEEP:-0}" != 1 ]]; then
    "${DC[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP"
  exit $status
}
trap cleanup EXIT

# ---- images ----
export API_IMAGE=supporters-api:smoke WEB_IMAGE=supporters-web:smoke
export MIGRATE_IMAGE=supporters-migrate:smoke CADDY_IMAGE=supporters-caddy:smoke
if [[ "${SMOKE_SKIP_BUILD:-0}" != 1 ]]; then
  echo "building images"
  docker build -q -f apps/api/Dockerfile --target api -t "$API_IMAGE" .
  docker build -q -f apps/api/Dockerfile --target migrate -t "$MIGRATE_IMAGE" .
  docker build -q -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_APP_ENV=smoke -t "$WEB_IMAGE" .
  docker build -q -f deploy/caddy/Dockerfile -t "$CADDY_IMAGE" deploy/caddy
fi

# ---- fake secrets, generated fresh on every run and never written outside $TMP ----
rand() { openssl rand -hex "$1"; }
# Relative file names: native Windows openssl cannot read MSYS-style absolute paths.
(
  cd "$TMP"
  openssl genpkey -algorithm ed25519 -out jwt.pem 2>/dev/null
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -subj /CN=smoke \
    -keyout rds-ca.key -out rds-ca.pem -days 1 2>/dev/null
)
export DEPLOY_ENV=development
export RDS_CA_BUNDLE=$(cygpath -m "$TMP/rds-ca.pem" 2>/dev/null || echo "$TMP/rds-ca.pem")
export STATE_DIR=$TMP/state SUPPORTERS_ENV_SOURCE=environment
export COMPOSE_EXTRA_FILES=deploy/compose.smoke.yml
export CADDY_TLS_MODE=internal CADDY_HTTPS_BIND=127.0.0.1 CADDY_HTTPS_PORT=$PORT
export ORIGIN_DOMAIN=localhost ACME_DNS_ZONE_ID=Z0SMOKE
export APP_ORIGIN=https://localhost:$PORT
export ORIGIN_VERIFY_SECRET=$(rand 24)
export SMOKE_POSTGRES_PASSWORD=$(rand 12)
export DATABASE_URL=postgresql://supporters:$SMOKE_POSTGRES_PASSWORD@postgres:5432/supporters
export VALKEY_PASSWORD=$(rand 16)
JWT_PRIVATE_KEY=$(base64 "$TMP/jwt.pem" | tr -d '\n')
export JWT_PRIVATE_KEY JWT_KEY_ID=smoke-1
OTP_HMAC_KEY=$(openssl rand -base64 32)
TOTP_ENCRYPTION_KEY=$(openssl rand -base64 32)
export OTP_HMAC_KEY TOTP_ENCRYPTION_KEY
# Search keys are random: this test does not call search, so no scoped keys are created.
export MEILI_MASTER_KEY=$(rand 16) MEILI_SEARCH_KEY=$(rand 16) MEILI_INDEX_KEY=$(rand 16)
export S3_BUCKET=supporters-smoke MEDIA_PUBLIC_URL=http://localhost:9000/supporters-smoke
export S3_ENDPOINT=http://minio:9000 S3_FORCE_PATH_STYLE=true
export S3_ACCESS_KEY_ID=minio-$(rand 4) S3_SECRET_ACCESS_KEY=$(rand 16)
export BREACHED_PASSWORD_CHECK=false LOG_LEVEL=info
# A DSN that goes nowhere: exercises the Sentry start-up path (events are dropped on the floor).
export SENTRY_DSN=https://smoke@sentry.invalid/1

echo "starting the stack"
"${DC[@]}" up -d --wait postgres
deploy/start.sh development smoke

curl_origin() { curl --silent --show-error --insecure --max-time 10 --resolve "localhost:$PORT:127.0.0.1" "$@"; }
URL=https://localhost:$PORT
HDR=(-H "X-Origin-Verify: $ORIGIN_VERIFY_SECRET")
NL=$'\n'

echo "checks"
# 1. Requests without the origin secret get no response at all; the right secret gets through.
if curl_origin "$URL/" >/dev/null 2>&1; then fail "a request without X-Origin-Verify was answered"; fi
if curl_origin -H "X-Origin-Verify: wrong" "$URL/" >/dev/null 2>&1; then fail "a request with a wrong X-Origin-Verify was answered"; fi
pass "requests without (or with a wrong) X-Origin-Verify are dropped"

# 2. /health through Caddy reaches the API.
body=$(curl_origin "${HDR[@]}" "$URL/health") || fail "/health unreachable"
[[ "$body" == *'"status":"ok"'* ]] || fail "/health returned: $body"
pass "/health -> $body"

# 3. /ready (database + Valkey) from inside the API container; it is not routed publicly.
ready=$("${DC[@]}" exec -T api \
  node -e "fetch('http://127.0.0.1:3001/ready').then(async r=>process.stdout.write(r.status+' '+await r.text()))")
[[ "$ready" == '200 '*'"database":"ok"'*'"valkey":"ok"'* ]] || fail "/ready returned: $ready"
pass "/ready -> $ready"

# 4. Signup: send an OTP, read it from the API's console SMS sender, register.
# Sets $code and $body of the response (no temp file: native Windows curl cannot write MSYS paths).
post() {
  local out
  out=$(curl_origin "${HDR[@]}" -H "Origin: $APP_ORIGIN" -H 'X-Client: mobile' -H 'Content-Type: application/json' \
    -w "${NL}%{http_code}" -X POST "$URL$1" -d "$2")
  code=${out##*"$NL"}
  body=${out%"$NL"*}
}
phone=+9198$(printf '%08d' $((RANDOM * RANDOM % 100000000)))
post /v1/auth/otp/send "{\"purpose\":\"signup\",\"phone\":\"$phone\"}"
[[ "$code" == 202 ]] || fail "otp/send returned $code: $body"
otp=
for _ in 1 2 3 4 5 6 7 8 9 10; do
  otp=$("${DC[@]}" logs --no-color api 2>&1 | grep -o 'OTP for [^:]*: [0-9]*' | tail -1 | sed 's/.*: //' || true)
  [[ -n "$otp" ]] && break
  sleep 1
done
[[ -n "$otp" ]] || fail "no OTP in the API output"
post /v1/auth/register "{\"name\":\"Smoke Test\",\"phone\":\"$phone\",\"password\":\"$(rand 12)-Aa1\",\"otp\":\"$otp\",\"policyVersion\":\"2026-10-28\"}"
[[ "$code" == 201 ]] || fail "register returned $code: $body"
[[ "$body" == *'"accessToken"'* ]] || fail "register returned no access token"
pass "signup through Caddy -> 201 with tokens"

# 5. The web app answers on the home page and its health route.
get() {
  local out
  out=$(curl_origin "${HDR[@]}" -w "${NL}%{http_code}" "$URL$1")
  code=${out##*"$NL"}
  body=${out%"$NL"*}
}
get /
[[ "$code" == 200 ]] || fail "web home returned $code"
pass "web home -> 200"
get /api/health
[[ "$code" == 200 ]] || fail "web /api/health returned $code"
pass "web /api/health -> 200"

# 6. Nothing but Caddy is published; Valkey and Meilisearch are on internal networks only.
published=$(docker ps --filter "label=com.docker.compose.project=$COMPOSE_PROJECT_NAME" --format '{{.Names}} {{.Ports}}' | grep -- '->' || true)
[[ "$(wc -l <<<"$published" | tr -d ' ')" == 1 && "$published" == *caddy* ]] || fail "unexpected published ports: $published"
pass "only caddy publishes a port"

echo "SMOKE PASSED"
