#!/usr/bin/env bash
# Builds the four release images (api, web, migrate, caddy), scans each with Trivy, and pushes them.
# Used by .github/workflows/deploy.yml; also runs on a laptop with PUSH=0.
#
#   deploy/build-images.sh <staging|production> <image-tag>
#
#   REGISTRY   registry host, e.g. <account-id>.dkr.ecr.ap-south-1.amazonaws.com (required)
#   NS         repository namespace                        (default supporters)
#   PUSH       1 to push after a clean scan                (default 0)
#   PLATFORM   e.g. linux/arm64 for the Graviton server    (default: this machine's)
#   SCAN       0 to skip Trivy                             (default 1)
#
# A CRITICAL vulnerability that has a fix blocks the release (backend spec, Supply chain). HIGH
# findings are listed but do not block. An image whose tag already exists in the registry is skipped,
# so re-running a deploy never rebuilds (ECR tags are immutable) and a tag always means one build.
#
# The web image bakes in NEXT_PUBLIC_* values, so it is built per environment. They come from the
# environment: NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT, and SENTRY_AUTH_TOKEN (passed as
# a BuildKit secret, never as a build argument).
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

ENVIRONMENT=${1:?usage: build-images.sh <staging|production> <image-tag>}
TAG=${2:?usage: build-images.sh <staging|production> <image-tag>}
REGISTRY=${REGISTRY:?REGISTRY is required}
NS=${NS:-supporters}
PUSH=${PUSH:-0}
SCAN=${SCAN:-1}
# Trivy, pinned by digest (Renovate bumps it). Its vulnerability database is fetched on each run.
TRIVY_IMAGE=${TRIVY_IMAGE:-aquasec/trivy:0.76.2@sha256:8f6bb947dbc528902e11f2f5be52f7b519f6a39d5d148f41166f2040499768fb}
platform=()
[[ -n "${PLATFORM:-}" ]] && platform=(--platform "$PLATFORM")

echo "::group::Build settings" 2>/dev/null || true
echo "environment=$ENVIRONMENT tag=$TAG registry=$REGISTRY push=$PUSH scan=$SCAN platform=${PLATFORM:-native}"
echo "::endgroup::" 2>/dev/null || true

exists() { # name -> 0 when the tag is already in the registry
  [[ "$PUSH" == 1 ]] || return 1
  aws ecr describe-images --repository-name "$NS/$1" --image-ids "imageTag=$TAG" >/dev/null 2>&1
}

scan() { # image
  [[ "$SCAN" == 1 ]] || return 0
  local trivy=(docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache "$TRIVY_IMAGE" image --quiet --scanners vuln --ignore-unfixed)
  echo "Trivy: $1 (HIGH, informational)"
  "${trivy[@]}" --severity HIGH --exit-code 0 "$1"
  echo "Trivy: $1 (CRITICAL, blocking)"
  "${trivy[@]}" --severity CRITICAL --exit-code 1 "$1"
}

build() { # name, then docker build arguments
  local name=$1 image="$REGISTRY/$NS/$1:$TAG"
  shift
  if exists "$name"; then
    echo "$image already exists, skipping"
    return 0
  fi
  echo "::group::Build $image" 2>/dev/null || true
  docker build "${platform[@]}" --label "org.opencontainers.image.revision=${GITHUB_SHA:-unknown}" \
    --label "org.opencontainers.image.version=$TAG" -t "$image" "$@"
  echo "::endgroup::" 2>/dev/null || true
  scan "$image"
  if [[ "$PUSH" == 1 ]]; then docker push "$image"; fi
}

build api -f apps/api/Dockerfile --target api .
build migrate -f apps/api/Dockerfile --target migrate .
build caddy -f deploy/caddy/Dockerfile deploy/caddy

web_args=(-f apps/web/Dockerfile --build-arg "NEXT_PUBLIC_APP_ENV=$ENVIRONMENT" --build-arg "NEXT_PUBLIC_SENTRY_RELEASE=$TAG")
[[ -n "${NEXT_PUBLIC_SENTRY_DSN:-}" ]] && web_args+=(--build-arg "NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN")
[[ -n "${SENTRY_ORG:-}" ]] && web_args+=(--build-arg "SENTRY_ORG=$SENTRY_ORG")
[[ -n "${SENTRY_PROJECT:-}" ]] && web_args+=(--build-arg "SENTRY_PROJECT=$SENTRY_PROJECT")
# Source maps are uploaded only when a token exists (never on pull requests or forks).
[[ -n "${SENTRY_AUTH_TOKEN:-}" ]] && web_args+=(--secret "id=sentry_auth_token,env=SENTRY_AUTH_TOKEN")
build web "${web_args[@]}" .
