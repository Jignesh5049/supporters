#!/usr/bin/env bash
# Rolls the stack to an image tag on this server. Run as root, by EC2 user data at boot and by the
# deploy workflow (SSM Run Command), from wherever the deploy files were copied (/opt/supporters).
#
#   deploy/start.sh <staging|production> <image-tag>
#
# What it does, in order (any failure stops it before the running stack is touched, except the
# last step, which rolls back):
#   1. takes a lock, so two deploys never overlap
#   2. loads every SecureString under /supporters/<env>/ from SSM Parameter Store into this
#      process's environment (the instance role; nothing is written to disk)
#   3. logs in to ECR and pulls the images for <image-tag>
#   4. starts Valkey and Meilisearch, then runs `prisma migrate deploy` once, in a throwaway
#      container, and stops here if it fails (the old API keeps serving)
#   5. replaces api, worker, web and caddy and waits for their healthchecks
#   6. if they do not become healthy, brings the previous tag back (no migration) and exits 1
#
# Environment knobs (all optional):
#   SUPPORTERS_ENV_SOURCE=environment  skip SSM and ECR and use variables already exported
#                                      (local smoke test, deploy/smoke.sh)
#   SSM_PATH         parameter path prefix           (default /supporters/<env>)
#   AWS_REGION       region for SSM and ECR          (default ap-south-1)
#   ECR_REGISTRY     <account-id>.dkr.ecr.<region>.amazonaws.com (default: from the instance role)
#   STATE_DIR        where the current and previous tags are kept (default /var/lib/supporters)
#   WAIT_TIMEOUT     seconds to wait for healthy containers (default 180)
#   MIGRATE_TIMEOUT  seconds the migration may run (default 300)
set -Eeuo pipefail

DEPLOY_ENV=${1:?usage: start.sh <staging|production> <image-tag>}
IMAGE_TAG=${2:?usage: start.sh <staging|production> <image-tag>}
[[ "$IMAGE_TAG" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || { echo "invalid image tag" >&2; exit 64; }

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && { pwd -W 2>/dev/null || pwd; })
# shellcheck source=deploy/load-env.sh
. "$HERE/load-env.sh"

COMPOSE_FILES=(-f "$HERE/compose.prod.yml")
# Extra compose files (the smoke test adds one), colon separated.
if [[ -n "${COMPOSE_EXTRA_FILES:-}" ]]; then
  IFS=: read -ra extra <<<"$COMPOSE_EXTRA_FILES"
  for f in "${extra[@]}"; do COMPOSE_FILES+=(-f "$f"); done
fi
STATE_DIR=${STATE_DIR:-/var/lib/supporters}
WAIT_TIMEOUT=${WAIT_TIMEOUT:-180}
MIGRATE_TIMEOUT=${MIGRATE_TIMEOUT:-300}
compose() { docker compose "${COMPOSE_FILES[@]}" "$@"; }

# ---- 1. one deploy at a time ----
mkdir -p "$STATE_DIR"
if command -v flock >/dev/null; then
  exec 9>"$STATE_DIR/deploy.lock"
  flock -n 9 || { log "another deploy is running, giving up"; exit 75; }
else
  # No flock (a developer machine): a directory is an atomic lock.
  mkdir "$STATE_DIR/deploy.lock.d" 2>/dev/null || { log "another deploy is running, giving up"; exit 75; }
  trap 'rmdir "$STATE_DIR/deploy.lock.d"' EXIT
fi

# ---- 2. secrets and images ----
load_env "$DEPLOY_ENV"
resolve_images "$IMAGE_TAG"
if [[ "$SOURCE" == ssm ]]; then
  log "pulling images tagged $IMAGE_TAG"
  compose pull --quiet api web migrate caddy
  # CloudWatch agent: container logs and host metrics (deploy/cloudwatch).
  if [[ -x /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl ]]; then
    sed "s#__ENV__#$DEPLOY_ENV#g" "$HERE/cloudwatch/amazon-cloudwatch-agent.json" >/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s \
      -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json >/dev/null \
      || log "warning: could not apply the CloudWatch agent config"
  fi
fi
CURRENT=$(cat "$STATE_DIR/current-tag" 2>/dev/null || true)
# What to bring back if the new release is unhealthy.
PREVIOUS_API_IMAGE=${PREVIOUS_API_IMAGE:-$API_IMAGE}
PREVIOUS_WEB_IMAGE=${PREVIOUS_WEB_IMAGE:-$WEB_IMAGE}
PREVIOUS_CADDY_IMAGE=${PREVIOUS_CADDY_IMAGE:-$CADDY_IMAGE}
if [[ "$SOURCE" == ssm && -n "$CURRENT" ]]; then
  PREVIOUS_API_IMAGE=${API_IMAGE%:*}:$CURRENT
  PREVIOUS_WEB_IMAGE=${WEB_IMAGE%:*}:$CURRENT
  PREVIOUS_CADDY_IMAGE=${CADDY_IMAGE%:*}:$CURRENT
fi

# ---- 3. data services, then the migration (once, fail fast) ----
log "starting valkey and meilisearch"
compose up --detach --wait --wait-timeout "$WAIT_TIMEOUT" valkey meilisearch

if [[ "${SKIP_MIGRATE:-0}" != 1 ]]; then
  log "running prisma migrate deploy ($IMAGE_TAG)"
  # Prisma also takes a PostgreSQL advisory lock, so a second runner would wait, not collide.
  # Migrations must be backward compatible (add first, remove one release later): the previous
  # API keeps serving while this runs and is what a rollback returns to.
  if ! timeout "$MIGRATE_TIMEOUT" docker compose "${COMPOSE_FILES[@]}" run --rm --no-deps migrate; then
    log "MIGRATION FAILED: nothing was replaced, the previous release is still serving"
    exit 2
  fi
fi

# ---- 4. roll the application containers ----
log "rolling api, worker, web and caddy to $IMAGE_TAG"
if compose up --detach --wait --wait-timeout "$WAIT_TIMEOUT" --remove-orphans api worker web caddy; then
  printf '%s\n' "$IMAGE_TAG" >"$STATE_DIR/current-tag"
  if [[ -n "$CURRENT" && "$CURRENT" != "$IMAGE_TAG" ]]; then printf '%s\n' "$CURRENT" >"$STATE_DIR/previous-tag"; fi
  compose ps --format 'table {{.Service}}\t{{.Status}}'
  # Images older than 3 days that no container uses (never containers or volumes).
  if [[ "$SOURCE" == ssm ]]; then docker image prune --all --force --filter "until=72h" >/dev/null 2>&1 || true; fi
  log "DEPLOYED $IMAGE_TAG"
  exit 0
fi

# ---- 5. unhealthy: roll back ----
log "ROLLOUT FAILED for $IMAGE_TAG"
compose ps --format 'table {{.Service}}\t{{.Status}}' || true
compose logs --no-color --tail 40 api web worker caddy 2>&1 | sed 's/^/    /' || true
if [[ -n "$CURRENT" && "$CURRENT" != "$IMAGE_TAG" ]]; then
  log "rolling back to $CURRENT"
  export API_IMAGE=$PREVIOUS_API_IMAGE WEB_IMAGE=$PREVIOUS_WEB_IMAGE CADDY_IMAGE=$PREVIOUS_CADDY_IMAGE
  if compose up --detach --wait --wait-timeout "$WAIT_TIMEOUT" --remove-orphans api worker web caddy; then
    log "ROLLED BACK to $CURRENT"
  else
    log "ROLLBACK ALSO FAILED: manual action needed (deploy/README.md, Common failures)"
  fi
else
  log "no previous release to roll back to"
fi
exit 1
