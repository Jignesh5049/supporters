# Production image for the Next.js web app (web spec, Testing and deployment): `output: 'standalone'`,
# Node 24 slim, non-root. Build from the repository root:
#   docker build -f apps/web/Dockerfile -t supporters-web \
#     --build-arg NEXT_PUBLIC_APP_ENV=staging .
#
# Only NEXT_PUBLIC_* values are baked in at build time, so each environment gets its own build
# (they end up in the browser bundle, so never pass a secret as a build arg). Everything else
# (API_INTERNAL_URL, APP_ORIGIN, ...) is read at container start.
ARG NODE_IMAGE=node:24-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54

# ---- build ----
FROM ${NODE_IMAGE} AS build
RUN npm install --global --ignore-scripts pnpm@12.16.1
WORKDIR /repo

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY deploy/migrate/package.json deploy/migrate/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/shared/package.json packages/shared/
COPY packages/ui-native/package.json packages/ui-native/
COPY packages/ui-web/package.json packages/ui-web/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@supporters/web..."

COPY packages packages
COPY apps/web apps/web

# Build-time public configuration. Unset means the feature is off (for example Sentry).
ARG NEXT_PUBLIC_APP_ENV=production
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_SENTRY_RELEASE=
ENV NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV} \
    NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN} \
    NEXT_PUBLIC_SENTRY_RELEASE=${NEXT_PUBLIC_SENTRY_RELEASE} \
    NEXT_TELEMETRY_DISABLED=1
# Source map upload to Sentry happens during the build, only when a token is passed as a BuildKit
# secret (`docker build --secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN`). A secret is not part
# of any layer or the image history, unlike an ARG. Without it nothing is uploaded and no maps ship.
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
ENV SENTRY_ORG=${SENTRY_ORG} SENTRY_PROJECT=${SENTRY_PROJECT}
WORKDIR /repo/apps/web
RUN --mount=type=secret,id=sentry_auth_token,required=false \
    if [ -f /run/secrets/sentry_auth_token ]; then SENTRY_AUTH_TOKEN=$(cat /run/secrets/sentry_auth_token); export SENTRY_AUTH_TOKEN; fi \
    && pnpm run build \
    && mkdir -p .next/standalone/apps/web/.next \
    && cp -r .next/static .next/standalone/apps/web/.next/static \
    && if [ -d public ]; then cp -r public .next/standalone/apps/web/public; fi

# ---- runtime ----
FROM ${NODE_IMAGE} AS web
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
# The standalone trace holds server.js and just the node_modules it needs, laid out like the
# workspace (so the entry point is apps/web/server.js).
COPY --from=build --chown=root:root /repo/apps/web/.next/standalone ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "apps/web/server.js"]
