# Deploying Supporters

How the app runs on AWS and how to operate it. Specs: [Hosting on AWS](../docs/specs/product-spec.md#hosting-on-aws), [Infrastructure and secrets](../docs/specs/backend-spec.md#security) and [Testing, observability and delivery](../docs/specs/backend-spec.md#testing-observability-and-delivery). The infrastructure itself is Terraform under `infra/` (see `infra/README.md`).

```text
CloudFront ──443, X-Origin-Verify──▶ Caddy ──/v1/*, /health──▶ api ──▶ valkey, meilisearch (internal network)
                                       └──everything else──▶ web      └──▶ RDS, S3, SES (outbound)
                                                 worker (same image as api) ──▶ valkey, meilisearch, RDS
```

| File | What it is |
| --- | --- |
| `compose.prod.yml` | The stack: `caddy`, `web`, `api`, `worker`, `valkey`, `meilisearch`, plus the one-shot `migrate` job |
| `start.sh` | Rolls the stack to an image tag: secrets from SSM, migration once, health-checked rollout, rollback |
| `caddy/` | Caddy build (Route 53 DNS plugin), `Caddyfile` and its TLS snippets |
| `cloudwatch/amazon-cloudwatch-agent.json` | Container logs (30-day retention) and memory/disk metrics |
| `compose.smoke.yml`, `smoke.sh` | Local production-like test with fake secrets, PostgreSQL and MinIO |
| `env.example` | Every parameter the stack reads |
| `migrate/` | Pins the Prisma CLI used by the migrate image |

## Contract with the Terraform stack (`infra/`)

What this directory expects from the infrastructure, and what it provides.

**Expected from Terraform**

- **ECR repositories** `<prefix>/api`, `<prefix>/web`, `<prefix>/migrate` and `<prefix>/caddy`, with `prefix` = `ecr_repository_prefix` (default `supporters`). Immutable tags, scan on push. The instance role may pull from them. The deploy role (below) may push.
- **SSM parameters** under `/supporters/<env>/`, one per variable, the last path segment being the variable name (see `env.example`). Terraform already creates the placeholders and `ORIGIN_VERIFY_SECRET`. Two more parameters are needed that the current placeholder list lacks: `ORIGIN_DOMAIN` (already in `config_values`, used as Caddy's site name) and `ACME_DNS_ZONE_ID` (in `config_values`, used by the DNS challenge). `SENTRY_DSN`, `MEILI_*` and `VALKEY_PASSWORD` are placeholders to fill in by hand.
- **Instance** (Amazon Linux 2023, arm64): Docker, the Compose plugin, `aws` CLI, `jq`, `flock` and the CloudWatch agent, which the current user data installs. IMDSv2 with **hop limit 2**, so containers get the instance role (S3, SES, Caddy's Route 53 challenge). The instance role needs `ssm:GetParametersByPath` on its path with the KMS key, ECR pull, and CloudWatch Logs `CreateLogStream` and `PutLogEvents` on `/supporters/<env>/*`.
- **Log group** `/supporters/<env>/containers`, retention 30 days. (Terraform creates it; the agent config also sets the retention but the agent role may not be allowed to.)
- **DNS**: `origin.<domain>` → the instance's Elastic IP; CloudFront's origin is `origin.<domain>` over HTTPS with the custom header `X-Origin-Verify: <ORIGIN_VERIFY_SECRET>`. CloudFront routes `/v1/*` and `/health` to this origin with no caching; everything else too (Caddy does the routing).
- **Security group**: 443 from CloudFront's managed prefix list only. Nothing else is published: the compose file publishes only Caddy's 443.
- **The deploy role for GitHub OIDC** (trust: this repository, the `staging` and `production` environments): `ecr:*Push*` on the four repositories, `ssm:SendCommand` and `ssm:GetCommandInvocation` on the instance, and nothing else. Its ARN is the environment variable `AWS_DEPLOY_ROLE_ARN` (see "Deploy workflow" below); the instance id is `EC2_INSTANCE_ID`.

**Provided by this directory**

- The server needs **no repository access**. Each release's `migrate` image carries `/deploy/` (compose file, `start.sh`, CloudWatch config). The deploy copies it to `/opt/supporters/` and runs `start.sh`, so a rollback restores the matching compose file too. This replaces the TODO in the user data about copying `deploy/compose.prod.yml` to `/opt/supporters/compose.yml`.
- `start.sh <env> <tag>` is the only entry point. Terraform's user data does not start the app; the first deploy does (see "First deploy").
- `start.sh` fetches the RDS CA bundle to `/etc/supporters/rds-global-bundle.pem` if it is missing (the API and the migration need it for `sslmode=verify-full`).

## Environments

| | staging | production |
| --- | --- | --- |
| Deploys | automatically on merge to `dev` | a `v*` tag, or a manual run with a required reviewer |
| SSM path | `/supporters/staging` | `/supporters/production` |
| Server | `t4g.small` + `db.t4g.micro` | `t4g.large` + `db.t4g.micro` |

## Deploy workflow

`.github/workflows/deploy.yml` builds the four images on a Graviton (arm64) runner, scans each with Trivy (**a CRITICAL finding that has a fix stops the release**; HIGH findings are listed), pushes to ECR through **GitHub OIDC** (no long-lived keys), copies the release's `/deploy/` files out of the `migrate` image onto the server and runs `start.sh` through SSM Run Command. `start.sh` rolls back by itself when the new containers are not healthy; the workflow also checks `$PUBLIC_URL/health` from outside and rolls back to the previous tag if that fails.

| Trigger | Environment | Image tag |
| --- | --- | --- |
| push to `dev` | `staging`, automatic | `sha-<12 chars of the commit>` |
| push of a tag `vX.Y.Z` | `production`, after a reviewer approves | the tag |
| manual run | the chosen environment (production waits for a reviewer) | `sha-<commit>`, or an existing tag given as `image_tag` (that is the rollback) |
| pull request | none: images are built and scanned, nothing is pushed | `pr-<n>` |

The workflow is **inert until configured**: without the repository variable `DEPLOY_ENABLED=true`, a push or manual run ends with a notice in the run summary, and pull requests still get the build-and-scan check. `deploy-smoke.yml` runs `smoke.sh` on pull requests with no credentials.

**One-time setup in GitHub** (Settings → Secrets and variables → Actions, and Environments):

| Where | Name | Value |
| --- | --- | --- |
| Repository variable | `DEPLOY_ENABLED` | `true` when you want deploys to run |
| Repository variable | `AWS_REGION` | `ap-south-1` (the default) |
| Environment `staging`, `production` | `AWS_DEPLOY_ROLE_ARN` | the OIDC role for that environment (`arn:aws:iam::<account-id>:role/...`) |
| Environment `staging`, `production` | `EC2_INSTANCE_ID` | `i-...` of that environment's server |
| Environment (optional) | `PUBLIC_URL` | `https://<domain>`: enables the outside-in health check and rollback |
| Environment (optional) | `ECR_REPOSITORY_NS` | repository namespace, default `supporters` |
| Environment (optional) | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` | the browser DSN is baked into that environment's web image |
| Environment secret (optional) | `SENTRY_AUTH_TOKEN` | enables source map upload during the web build; without it no maps are uploaded or shipped |
| Environment `production` | required reviewers | at least one person; also restrict deployment branches/tags to `v*` |

The OIDC role trusts `token.actions.githubusercontent.com` with the subject `repo:<owner>/<repo>:environment:<name>` and may only push to the four ECR repositories and run `ssm:SendCommand` / `ssm:GetCommandInvocation` against its own instance. It never receives the SSM secrets: the server reads those with its own instance role.

Every action is pinned to a commit SHA, the workflow's default permissions are `contents: read`, and only the release job gets `id-token: write`. Rollback: run the workflow with `image_tag` set to the previous tag (the run summary names it).

## Observability

- **Logs**: pino JSON from the API and worker (one line per request with `requestId`, `userId` when signed in and `responseTime`; `/health` and `/ready` are not logged), Caddy's JSON access log, Next.js output. Docker rotates them on the host and the CloudWatch agent ships them (see "Viewing logs"). Redaction follows the spec's list (`authorization`, `cookie`, `set-cookie`, passwords, OTPs, tokens, phone numbers, emails, payout fields) in the API and in Caddy's log.
- **Sentry** (free tier): set `SENTRY_DSN` in SSM for the API, worker and web server, and build the web image with the browser DSN (`NEXT_PUBLIC_SENTRY_DSN`). With no DSN Sentry is off. Traces are sampled at 10%, no user data, cookies, headers, bodies or query strings are collected, and `scrubEvent` removes anything matching the spec's redaction list from what remains. **The CSP's `connect-src` must allow the DSN's ingest host** (`https://o<id>.ingest.<region>.sentry.io`) or the browser SDK is silently blocked; that header is owned by the web CSP work. Mobile Sentry is configured in the mobile app (a separate PR).
- **Probes**: `/health` (liveness, no dependencies; public through Caddy for uptime monitors) and `/ready` (PostgreSQL, Valkey and queue backlog, 503 when one fails; internal only: `ops.sh <env> status` or `docker exec`). The queue check fails above 5,000 waiting jobs. CloudWatch alarms for 5xx, p95 latency, CPU, DB connections and queue backlog belong to the Terraform stack; the container logs give 5xx counts through a metric filter on the Caddy log.

## What start.sh does

1. Takes a lock (`/var/lib/supporters/deploy.lock`); a second deploy at the same time exits 75.
2. Reads every parameter under the SSM path into its own environment (instance role, `--with-decryption`). Nothing is written to disk. Compose then passes each service only the variables it needs.
3. Refuses to continue if a required parameter is missing, `ORIGIN_VERIFY_SECRET` is shorter than 32 characters or `VALKEY_PASSWORD` is not 24+ URL-safe characters. (An empty origin secret would make Caddy accept every request that merely has the header.)
4. Logs in to ECR, pulls `api`, `web`, `migrate` and `caddy` at the tag.
5. Starts Valkey and Meilisearch and waits for them.
6. **Runs `prisma migrate deploy` once** in a throwaway `migrate` container (time limit 5 minutes). If it fails, the script stops with exit code 2 and the old release keeps serving. Prisma also holds a PostgreSQL advisory lock, so a second runner would wait.
7. Replaces `api`, `worker`, `web` and `caddy` and waits for their healthchecks (180 s). Exit 0 and `DEPLOYED <tag>` on success.
8. On failure, prints container logs, brings the previous tag back (without migrating) and exits 1.

**Migrations must be backward compatible**: the previous API keeps serving while step 6 runs, and a rollback runs the old code against the new schema. Add columns and tables first; remove or rename in a later release.

A rollout restarts containers one service at a time, so expect a few seconds of errors during a deploy on a single server.

## First deploy of an environment

Order matters. Staging first.

1. Terraform applied (`infra/README.md`). Check the instance shows up in Systems Manager.
2. Fill in the secret parameters (`env.example`). Generate keys locally, never on a shared machine:

   ```bash
   pnpm --filter @supporters/api --silent keys:generate        # JWT_PRIVATE_KEY, JWT_KEY_ID, OTP_HMAC_KEY
   openssl rand -base64 32                                      # TOTP_ENCRYPTION_KEY
   openssl rand -hex 16                                         # VALKEY_PASSWORD, MEILI_MASTER_KEY
   aws ssm put-parameter --name /supporters/staging/VALKEY_PASSWORD --type SecureString --key-id <kms-key-arn> --overwrite --value "<value>"
   ```

   Create the application database role by hand with `CONNECT` and DML rights only (see `infra/README.md`) and store its URL as `DATABASE_URL`. `MEILI_SEARCH_KEY` and `MEILI_INDEX_KEY` can hold a placeholder of 16+ characters for now.
3. Run the **Deploy** workflow for the environment (or push to `dev` for staging). The first run creates the volumes, runs all migrations, starts the stack and fails the health wait if a parameter is wrong. The log names the problem.
4. Create the scoped search keys and indexes once, from a Session Manager shell (`aws ssm start-session --target <instance-id>`):

   ```bash
   sudo /opt/supporters/ops.sh staging search-init   # prints MEILI_SEARCH_KEY and MEILI_INDEX_KEY
   ```

   Put the two printed keys in SSM (`MEILI_SEARCH_KEY`, `MEILI_INDEX_KEY`) and run the deploy again so the API and worker get them.
5. Create the first admin: `sudo /opt/supporters/ops.sh staging create-admin --help`.
6. Smoke the public URL: `https://<domain>/health`, `https://<domain>/`, and sign up.

## Everyday operations

`ops.sh <env> <command>` runs a one-off command in the current API image with the same secrets, on the same networks:

| Command | What it does |
| --- | --- |
| `search-init` | Creates the scoped Meilisearch keys and indexes (needs `MEILI_MASTER_KEY`, which only this command passes) |
| `reindex` | Rebuilds the search indexes from PostgreSQL |
| `create-admin ...` | Creates an admin account (`node dist/scripts/create-admin.js`) |
| `status` | `docker compose ps` for the stack |
| `logs <service>` | Recent container logs |

### Viewing logs

- **CloudWatch**: log group `/supporters/<env>/containers`. Each line is Docker's JSON wrapper; the service is `attrs["com.docker.compose.service"]` and the application's own JSON is in `log`. Logs Insights:

  ```text
  fields @timestamp, attrs.`com.docker.compose.service` as service, log
  | filter service = "api" and log like /"level":(50|60)/
  | sort @timestamp desc | limit 50
  ```

  Every API request carries `requestId` (also returned to clients in `x-request-id`): `filter log like /<requestId>/`.
- **On the server** (Session Manager): `sudo /opt/supporters/ops.sh <env> logs api`. Docker keeps 5 × 10 MB per container.

### Rolling back

Redeploy the previous tag. The deploy rolls back automatically when the new release is unhealthy. To do it by hand:

- Actions → **Deploy** → Run workflow → environment, `image_tag` = the previous tag (shown in the run summary of the last good deploy; also `/var/lib/supporters/previous-tag` on the server).
- Or on the server: `sudo /opt/supporters/start.sh <env> $(cat /var/lib/supporters/previous-tag)`. A manual rollback runs `migrate deploy` again, which is a no-op for tags already applied.

Never roll back across a migration that dropped or renamed something (migrations are meant not to).

### Rotating secrets

- **Any SSM value** (database password, Valkey, JWT, ...): `aws ssm put-parameter --overwrite`, then run the deploy (or `start.sh <env> <current-tag>`) so containers restart with it. Valkey and Meilisearch pick the new password on restart; both are internal.
- **X-Origin-Verify** (quarterly): in `infra/`, change `origin_verify_rotation`. To avoid a window where CloudFront and Caddy disagree, first put the **old** value in `ORIGIN_VERIFY_SECRET_PREVIOUS` and the new one in `ORIGIN_VERIFY_SECRET`, redeploy (Caddy accepts both), apply Terraform (CloudFront sends the new one), then delete `ORIGIN_VERIFY_SECRET_PREVIOUS` and redeploy.
- **JWT signing key**: set `JWT_PREVIOUS_PUBLIC_KEY` + `JWT_PREVIOUS_KEY_ID` to the old key's public half, put the new key in `JWT_PRIVATE_KEY` and `JWT_KEY_ID`, redeploy; remove the previous pair after a day (access tokens live 15 minutes, refresh tokens are opaque).
- **Database password**: change it in RDS and `DATABASE_URL` together, then redeploy; sessions reconnect.

### Restoring from backup

- **Database**: RDS point-in-time recovery restores to a new instance (RPO ≤ 5 minutes). Restore to a new instance, check it, point `DATABASE_URL` at it (SSM), redeploy, then retire the old one. In Terraform, `terraform import` the new instance or change the identifier; do not delete the old instance first. A restore drill runs before launch (product spec, Quality bar).
- **Search index**: derived data. After a restore run `ops.sh <env> reindex`.
- **Valkey**: queues and rate limits only; losing it loses queued jobs. The outbox relay re-enqueues pending work; `reindex` repairs search.
- **Media**: S3 versioning is on; restore an object by deleting its delete marker or copying an older version.
- **Server**: replace the instance from Terraform; the next deploy rebuilds everything from ECR and SSM. Volumes (`valkey-data`, `meili-data`, `caddy-data`) are on the root EBS volume, which has daily snapshots.

## Local smoke test

```bash
deploy/smoke.sh                      # builds the four images, ~5 minutes cold
SMOKE_SKIP_BUILD=1 deploy/smoke.sh   # reuse them
```

Uses fake secrets, PostgreSQL and MinIO, Caddy's internal CA, and checks the origin-secret rejection, `/health`, `/ready`, a signup through Caddy, and the web home page. Needs Docker and `openssl`. Because the API refuses to boot in staging or production until MSG91 exists, the smoke test runs it with `NODE_ENV=development`.

## Common failures

| Symptom | Likely cause and fix |
| --- | --- |
| `missing required parameters: ...` | The SSM parameter is empty or absent. Names only are logged. |
| `MIGRATION FAILED` | Read the migrate output above it. The old release is untouched. Fix forward (a new migration) and redeploy; a failed migration is never retried by itself. |
| API unhealthy, log says `Invalid environment: ...` | A variable is wrong; the message names the variable, never its value. API in `staging`/`production` also refuses `SMS_PROVIDER=console`. The worker refuses the passthrough media processor there, and uploads stay `processing` while no worker is running, so check that the `worker` container is up. |
| API cannot reach RDS (`self-signed certificate in certificate chain`) | `/etc/supporters/rds-global-bundle.pem` missing or stale: delete it and redeploy (it is re-downloaded). |
| Caddy restarts, log says `acme` or `route53` errors | The instance role lacks the Route 53 permission, IMDS hop limit is not 2, or `ACME_DNS_ZONE_ID`/`ORIGIN_DOMAIN` is wrong. Caddy keeps its certificate in `caddy-data`. |
| CloudFront returns 502 | Caddy is not up, the certificate for `origin.<domain>` is missing, or the security group is not allowing CloudFront. |
| CloudFront returns 504 or a 5xx for every request while Caddy is healthy | `X-Origin-Verify` in CloudFront does not match `ORIGIN_VERIFY_SECRET`: Caddy drops those requests. |
| `another deploy is running` (exit 75) | Wait, or check `docker ps` for a stuck `migrate` container. |
| Disk full | `docker image prune` (images only, never `--volumes`). The deploy already prunes old images. |
