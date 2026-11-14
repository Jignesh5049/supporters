# Production images for the Fastify API and BullMQ worker (target "api", the default) and for the
# database migration job (target "migrate"). Backend spec, Supply chain:
# the API image runs the API or the worker (`node dist/worker.js`).
#
# Build from the repository root (the pnpm workspace is the build context):
#   docker build -f apps/api/Dockerfile -t supporters-api .
#
# The base image is pinned by digest. Renovate bumps the digest; to do it by hand:
#   docker buildx imagetools inspect node:24-slim
ARG NODE_IMAGE=node:24-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54

# ---- build: install, generate the Prisma client, bundle, then keep production deps only ----
FROM ${NODE_IMAGE} AS build
# Same pnpm as "packageManager" in package.json.
RUN npm install --global --ignore-scripts pnpm@12.16.1
WORKDIR /repo

# Manifests first, so the dependency layer is cached until a manifest or the lockfile changes.
# Every workspace project's manifest is needed for --frozen-lockfile to match the lockfile.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/mobile/package.json apps/mobile/
COPY deploy/migrate/package.json deploy/migrate/
COPY packages/design-tokens/package.json packages/design-tokens/
COPY packages/shared/package.json packages/shared/
COPY packages/ui-native/package.json packages/ui-native/
COPY packages/ui-web/package.json packages/ui-web/
# Install scripts stay blocked (allowBuilds in pnpm-workspace.yaml); nothing here needs them.
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter "@supporters/api..." --filter "@supporters/migrate"

COPY packages/shared packages/shared
COPY apps/api apps/api
WORKDIR /repo/apps/api
RUN pnpm exec prisma generate && pnpm run build
# Production dependencies only (no vitest, eslint, tsx, esbuild, prisma CLI, ...). `deploy` injects
# @supporters/shared as a copy rather than a symlink.
RUN pnpm --filter @supporters/api deploy --prod /out-api
# The migrate image: just the pinned Prisma CLI plus the schema and migrations.
WORKDIR /repo
RUN pnpm --filter @supporters/migrate deploy --prod /out-migrate \
    && cp -r apps/api/prisma apps/api/prisma.config.ts /out-migrate/ \
    && rm -f /out-migrate/prisma/seed.ts /out-migrate/prisma/reference-data.ts

# One slim runtime base for both images. npm, npx and corepack are not needed to run the app,
# and their bundled packages are only scanner noise and attack surface.
FROM ${NODE_IMAGE} AS runtime
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
WORKDIR /app
# HOME is writable only through a tmpfs (compose), so the root filesystem stays read-only.
ENV NODE_ENV=production HOME=/tmp

# ---- migrate: `prisma migrate deploy`, run once per release before the API starts ----
FROM runtime AS migrate
# The schema engine talks TLS to RDS (sslmode=verify-full) through OpenSSL, which Prisma also needs to
# detect in order to pick the matching engine binary. node:24-slim has neither the CLI nor the hint.
RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=root:root /out-migrate/ ./
# The deploy files travel with the release (compose file, start script, CloudWatch agent config):
# the pipeline copies them out of this image onto the server, so the server needs no repository
# access and a rollback also restores the matching compose file. See deploy/README.md.
COPY --chown=root:root deploy/compose.prod.yml /deploy/compose.prod.yml
COPY --chown=root:root --chmod=0755 deploy/start.sh deploy/ops.sh /deploy/
COPY --chown=root:root deploy/load-env.sh /deploy/load-env.sh
COPY --chown=root:root deploy/cloudwatch /deploy/cloudwatch
# Fetch the schema engine binary now, so the container never downloads code at run time.
RUN node_modules/.bin/prisma --version
USER node
ENTRYPOINT ["node_modules/.bin/prisma"]
CMD ["migrate", "deploy"]

# ---- api: the default target; the worker is this image with `node dist/worker.js` ----
FROM runtime AS api
ENV HOST=0.0.0.0 PORT=3001
COPY --from=build --chown=root:root /out-api/node_modules ./node_modules
COPY --from=build --chown=root:root /out-api/package.json ./package.json
COPY --from=build --chown=root:root /repo/apps/api/dist ./dist
USER node
EXPOSE 3001
# Liveness only (/health never touches the database). /ready is for the load balancer and alarms.
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
# instrument.js starts Sentry before the app loads when SENTRY_DSN is set, and does nothing otherwise.
CMD ["node", "--import", "./dist/instrument.js", "dist/server.js"]
