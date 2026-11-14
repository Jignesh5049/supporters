# Sourced by start.sh and ops.sh (not run directly). Defines:
#   load_env <env>         secrets from SSM Parameter Store into this process's environment,
#                          required-variable checks, the RDS CA bundle
#   resolve_images <tag>   exports API_IMAGE, WEB_IMAGE, MIGRATE_IMAGE and CADDY_IMAGE, and logs
#                          in to ECR (skipped when SUPPORTERS_ENV_SOURCE=environment)
# Secrets are only ever in environment variables of the calling process; nothing is written to disk.
# shellcheck shell=bash

SOURCE=${SUPPORTERS_ENV_SOURCE:-ssm}
export AWS_REGION=${AWS_REGION:-ap-south-1}

log() { printf '%s %s: %s\n' "$(date -u +%FT%TZ)" "$(basename "$0")" "$*"; }

load_env() {
  DEPLOY_ENV=$1
  case "$DEPLOY_ENV" in staging | production | development) ;; *) echo "unknown environment: $DEPLOY_ENV" >&2; exit 64 ;; esac

  if [[ "$SOURCE" == ssm ]]; then
    local ssm_path=${SSM_PATH:-/supporters/$DEPLOY_ENV} params exports
    log "loading parameters from $ssm_path"
    params=$(aws ssm get-parameters-by-path --region "$AWS_REGION" --path "$ssm_path" --recursive \
      --with-decryption --query 'Parameters[].{n:Name,v:Value}' --output json)
    # The last path segment is the variable name; names that are not UPPER_SNAKE are skipped.
    # `@sh` quotes the value, so newlines (PEM keys) and quotes survive.
    exports=$(jq -r '.[] | [(.n | split("/") | last), .v] | select(.[0] | test("^[A-Z][A-Z0-9_]*$")) | "export \(.[0])=\(.[1] | @sh)"' <<<"$params")
    [[ -n "$exports" ]] || { log "no parameters found under $ssm_path"; exit 66; }
    eval "$exports"
  fi
  export DEPLOY_ENV

  # Fail now, with names only, rather than halfway through a rollout.
  local missing=() v
  for v in APP_ORIGIN DATABASE_URL VALKEY_PASSWORD JWT_PRIVATE_KEY JWT_KEY_ID OTP_HMAC_KEY \
    TOTP_ENCRYPTION_KEY S3_BUCKET MEDIA_PUBLIC_URL MEILI_MASTER_KEY MEILI_SEARCH_KEY \
    MEILI_INDEX_KEY ORIGIN_DOMAIN ORIGIN_VERIFY_SECRET ACME_DNS_ZONE_ID; do
    [[ -n "${!v:-}" ]] || missing+=("$v")
  done
  if ((${#missing[@]})); then log "missing required parameters: ${missing[*]}"; exit 66; fi
  # A short secret is a guessable one, and an empty one would let every request through Caddy.
  ((${#ORIGIN_VERIFY_SECRET} >= 32)) || { log "ORIGIN_VERIFY_SECRET must be at least 32 characters"; exit 66; }
  # Used in redis:// URLs and a shell command, so keep it to URL-safe characters.
  [[ "$VALKEY_PASSWORD" =~ ^[A-Za-z0-9_-]{24,}$ ]] || { log "VALKEY_PASSWORD must be 24+ URL-safe characters (A-Z a-z 0-9 _ -)"; exit 66; }

  # RDS signs its certificates with its own authority, which Node and OpenSSL do not trust by
  # default. Fetch the AWS-published bundle once (over HTTPS) if user data has not.
  local ca=${RDS_CA_BUNDLE:-/etc/supporters/rds-global-bundle.pem}
  if [[ "$SOURCE" == ssm && ! -s "$ca" ]]; then
    log "downloading the RDS certificate bundle"
    install -d -m 0755 "$(dirname "$ca")"
    curl --fail --silent --show-error --location --proto '=https' --tlsv1.2 \
      --output "$ca" https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
  fi
  [[ -s "$ca" ]] || { log "$ca is missing or empty"; exit 66; }
  export RDS_CA_BUNDLE=$ca
}

# Image references for a tag. In `environment` mode the caller exports the four *_IMAGE variables.
resolve_images() {
  local tag=$1
  if [[ "$SOURCE" == ssm ]]; then
    local ns=${ECR_REPOSITORY_NS:-supporters}
    ECR_REGISTRY=${ECR_REGISTRY:-$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com}
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY" >/dev/null
    export API_IMAGE=$ECR_REGISTRY/$ns/api:$tag
    export WEB_IMAGE=$ECR_REGISTRY/$ns/web:$tag
    export MIGRATE_IMAGE=$ECR_REGISTRY/$ns/migrate:$tag
    export CADDY_IMAGE=$ECR_REGISTRY/$ns/caddy:$tag
  fi
  : "${API_IMAGE:?}" "${WEB_IMAGE:?}" "${MIGRATE_IMAGE:?}" "${CADDY_IMAGE:?}"
}
