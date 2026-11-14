# Supporters infrastructure

Terraform for the launch tier in the product spec ([Hosting on AWS](../docs/specs/product-spec.md#hosting-on-aws)): one Graviton EC2 server plus managed AWS services in Mumbai (`ap-south-1`), about $70/month in the spec. **This directory only describes infrastructure. Nothing here has been applied**; no AWS account exists yet, and the code has only been checked statically (`fmt`, `validate`, `tflint`, `trivy config`), never planned against AWS.

## Architecture

```
 browsers + mobile app
          |
          v
  Route 53  ->  CloudFront (app, <domain>) + WAF            CloudFront (media.<domain>)
                 /v1/ws*, /v1/*  : no cache, all headers          |  Origin Access Control
                 /_next/static/* : cached 1 year                  v
                 default         : no cache, to Next.js       S3 bucket (private)
                       |  HTTPS + X-Origin-Verify              public/  served here only
                       v                                       chat/    signed URLs only
   EC2 t4g.large, public subnet, Elastic IP                    kyc/     never via CloudFront
   SG: 443 from CloudFront prefix list only, no SSH
   Caddy -> Next.js, API (REST + Socket.IO), worker, Valkey, Meilisearch   (Docker, from ECR)
                       |  5432, security-group-to-security-group
                       v
   RDS PostgreSQL 18, db.t4g.micro, private subnets, TLS required
```

No NAT Gateway. Supporting services: SSM Parameter Store (secrets and config, one KMS key), ECR (images, scan on push + Inspector), CloudWatch (logs, alarms) and SNS, AWS Budgets, CloudTrail, GuardDuty, SES (domain identity, DKIM, SPF, DMARC) and a GitHub OIDC role for deploys.

## Layout

```
infra/
  terraform/
    bootstrap/          one-off stack: state bucket + KMS key, lock table, GitHub OIDC provider
    modules/
      secrets/          KMS key, SSM Parameter Store placeholders, X-Origin-Verify secret
      network/          VPC, subnets, S3 gateway endpoint, security groups, flow logs (no NAT)
      compute/          EC2 t4g, instance profile, Elastic IP, user data, EBS snapshots
      database/         RDS PostgreSQL 18, parameter group (TLS required), backups
      storage/          private media bucket, KMS key, lifecycle, CORS
      edge/             CloudFront (app + media), WAF, ACM certificate, Route 53 records
      registry/         ECR repositories, lifecycle, enhanced scanning
      monitoring/       log groups, SNS topics, CloudWatch alarms
      baseline/         CloudTrail, GuardDuty, AWS Budgets (once per account)
      deploy-access/    GitHub OIDC deploy role
      email/            SES domain identity, DKIM, MAIL FROM, DMARC records
      night-schedule/   stop/start staging at night
    envs/
      production/       root module: one state file
      staging/          root module: smaller, stoppable at night
```

### Environments: separate roots, not workspaces

Production and staging are separate root modules under `envs/`, each with its own state file, instead of one root with Terraform workspaces.

- **Blast radius.** A mistaken `apply` in the wrong workspace is easy to make and hits production. With separate directories you `cd` into the environment you mean, and the state key (`production/…` vs `staging/…`) is explicit.
- **They are allowed to differ.** Staging has a nightly stop schedule, a smaller server and no account-level resources (CloudTrail, GuardDuty, budgets, ECR, SES); workspaces would need `count = terraform.workspace == "production" ? 1 : 0` conditions everywhere.
- **Reviewable.** A PR that touches `envs/staging` cannot alter production by accident, and CI validates each root on its own.

Both roots call the same modules, so the two environments cannot drift apart in structure. They share one AWS account (to keep cost down), one Route 53 zone, the ECR repositories (owned by production) and the OIDC provider (owned by bootstrap). Staging uses `staging.<domain>`, `media-staging.<domain>` and `origin-staging.<domain>`, and its own VPC (`10.30.0.0/16`).

## Bootstrapping an account, step by step

Everything below runs from a human admin session (IAM Identity Center); nothing needs long-lived access keys.

1. **Client prerequisites** (checklist at the end): the AWS account exists, root has MFA, the team has IAM Identity Center access, and the client owns a domain.
2. **Install tools:** Terraform 1.17, and `tflint` and `trivy` if you want the CI checks locally. Keep provider downloads off a small system drive:
   ```bash
   export TF_PLUGIN_CACHE_DIR=<repo-drive>/.terraform-plugin-cache
   mkdir -p "$TF_PLUGIN_CACHE_DIR"
   export AWS_PROFILE=<identity-center-profile>
   ```
3. **Create the Route 53 hosted zone** for `<domain>` by hand and delegate it: copy the four name servers to the registrar. Terraform looks the zone up rather than creating it, because certificates cannot validate until delegation works.
   ```bash
   aws route53 create-hosted-zone --name <domain> --caller-reference "$(date +%s)"
   ```
4. **Bootstrap remote state** (one time per account):
   ```bash
   cd infra/terraform/bootstrap
   cp example.tfvars terraform.tfvars   # set state_bucket_name; git-ignored
   terraform init && terraform apply
   ```
   Remote state is an S3 bucket (versioned, KMS-encrypted, private, TLS only) plus a DynamoDB lock table. Bootstrap keeps its own state locally because the bucket does not exist yet: back up `terraform.tfstate`, or move it into the bucket by adding an `s3` backend block and running `terraform init -migrate-state`. Terraform 1.11+ can lock with an S3 lock file (`use_lockfile = true`) and deprecates DynamoDB locking; the table is kept because the brief asks for it, and switching is a one-line change in `backend.hcl`.
5. **Apply production** (staging is the same with `envs/staging`):
   ```bash
   cd infra/terraform/envs/production
   cp example.backend.hcl backend.hcl   # bucket, table, region, KMS key from the bootstrap outputs
   cp example.tfvars terraform.tfvars   # fill in the placeholders
   terraform init -backend-config=backend.hcl
   terraform plan -out=tfplan           # read it
   terraform apply tfplan
   ```
   Commit the generated `.terraform.lock.hcl` files (one per root) in the same PR, so every machine uses the same provider builds. CloudFront takes 10–15 minutes to deploy.
6. **Confirm the notification emails.** SNS sends a confirmation link to each `alert_emails` address, twice (Mumbai and us-east-1 topics). Budget alerts need no confirmation.
7. **Finish email.** Terraform creates the SES identity, three DKIM CNAMEs, the MAIL FROM MX/SPF records and a DMARC record (`p=none` to start). In the SES console (Mumbai) check that DKIM shows verified, then request **production access**; until it is granted SES only sends to verified addresses.
8. **Set the secrets.** Terraform creates every SecureString under `/supporters/<env>/` with the value `PLACEHOLDER-set-out-of-band` and never overwrites it afterwards:
   ```bash
   aws ssm put-parameter --name /supporters/production/JWT_PRIVATE_KEY --type SecureString \
     --key-id alias/supporters-production --overwrite --value file://jwt-private.pem
   ```
   Generate values with the API's `pnpm keys:generate` and `search:init` helpers (see `apps/api/.env.example`). Never put real values in `terraform.tfvars`, in git or in chat.
9. **Create the database role.** From a Session Manager session on the server (`aws ssm start-session --target <instance_id>`): read the master secret (ARN in the `db_master_secret_arn` output), create a least-privilege `supporters_app` role, and store `postgresql://supporters_app:<password>@<db-host>:5432/supporters?sslmode=verify-full` as `/supporters/<env>/DATABASE_URL`. `verify-full` needs the RDS CA bundle (`rds-ca-rsa2048-g1`, <https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem>) inside the API image.
10. **Chat URL signing key** (optional until chat attachments go live): create a key pair, put the public key in `chat_signing_public_key_pem`, apply again, and store the private key in SSM (`CLOUDFRONT_SIGNING_PRIVATE_KEY`).
    ```bash
    openssl genrsa -out chat-signing-private.pem 2048
    openssl rsa -pubout -in chat-signing-private.pem -out chat-signing-public.pem
    ```
11. **Hand over to the deploy pipeline** (separate work): the `github_deploy_role_arn` output, `instance_id`, `ssm_path` and the `ecr_repository_urls`. Create GitHub Environments `staging` and `production` (production with required reviewers) so the OIDC subject `repo:<org>/<repo>:environment:<env>` matches. The pipeline copies `deploy/compose.prod.yml` to `/opt/supporters/compose.yml` over SSM Run Command (TODO: owned by the containers and deploy-pipeline session).
12. **Before launch:** run the RDS point-in-time restore drill and an S3 version restore (spec: restore drill), check the budget limit, and add the office/VPN IPs to `admin_allowed_ipv4_cidrs`.
13. **After 2–3 months of steady load:** buy a Compute Savings Plan (about 30% off), and apply for AWS Activate credits before launch.

Rotating `X-Origin-Verify` (spec: quarterly): change `origin_verify_rotation` (for example `2027-Q1`), apply, then restart Caddy so it reads the new value. Requests fail between those two steps, so do it in a quiet window; a two-value overlap would need a Caddy config change.

## Variables

The full list is in each root's `variables.tf`, and `example.tfvars` shows a filled-in file with placeholders. The ones that matter:

| Variable | Default | Meaning |
| --- | --- | --- |
| `domain` | none (required) | Route 53 zone the client owns; `<domain>` in the specs |
| `instance_type` | `t4g.large` (staging `t4g.small`) | App server size |
| `db_instance_class` | `db.t4g.micro` | RDS size; Multi-AZ and bigger classes are the growth tier |
| `admin_allowed_ipv4_cidrs` / `_ipv6_cidrs` | `[]` (blocks everyone) | IPs allowed to open `/admin*` and `/v1/admin/*` |
| `chat_signing_public_key_pem` | `""` | Enables signed CloudFront URLs for `chat/` |
| `auth_rate_limit` | `300` | WAF requests per IP per 5 minutes on `/v1/auth/*` |
| `cloudfront_price_class` | `PriceClass_200` | Includes India without the costliest regions |
| `origin_verify_rotation` | `initial` | Change to rotate `X-Origin-Verify` |
| `alert_emails` | none (required) | Alarm, GuardDuty and budget recipients |
| `monthly_budget_usd` | `100` (production only) | Budget alerts at 80% and 100% |
| `github_repository` | none (required) | `<org>/<repo>` allowed to assume the deploy role |
| `night_schedule_enabled` | `true` (staging only) | Stop staging 22:00 IST, start 08:00 IST |

## What each part does

- **Network:** VPC `10.20.0.0/16`, two public subnets (server) and two private subnets (RDS, no default route). **No NAT Gateway.** A free S3 gateway endpoint serves S3 traffic. The server's security group accepts 443 only from CloudFront's managed prefix list and has no SSH rule; use Session Manager. RDS accepts 5432 only from the server's security group. Flow logs go to a 30-day encrypted log group.
- **Compute:** `t4g.large` on Amazon Linux 2023 arm64, encrypted gp3 root volume, IMDSv2 required, Elastic IP, daily EBS snapshots (7 kept). The instance role may use only its own S3 prefixes, SES sending from the domain, its own SSM path and key, CloudWatch under its own prefix, ECR pull and Caddy's DNS challenge record. User data installs Docker, the Compose plugin (checksum verified) and the CloudWatch agent; it does not start the app.
- **Database:** RDS PostgreSQL 18, single-AZ, 20 GB gp3 (autoscaling to 100 GB), encrypted, private, `rds.force_ssl=1`, 7-day backups with point-in-time recovery, deletion protection. RDS generates the master password into Secrets Manager (`manage_master_user_password`), so it never enters Terraform state or outputs.
- **Storage:** one private bucket with versioning (old versions kept 30 days), SSE-KMS, block-public-access, TLS-only policy, lifecycle rules and CORS for presigned `PUT`. `public/`, `chat/` and `kyc/` are key prefixes enforced by IAM and the bucket policy.
- **Edge:** the app distribution sends `X-Origin-Verify` to `origin.<domain>`; `/v1/ws*` and `/v1/*` are uncached and forward everything, `/_next/static/*` is cached for a year, everything else goes to Next.js uncached. `media.<domain>` reads the bucket through Origin Access Control and may read `public/*` only (plus signed `chat/*`); responses carry `nosniff`, HSTS and a sandbox CSP. WAF (CloudFront scope) has the Core and Known Bad Inputs managed sets, rate rules, and an admin IP allow-list that fails closed. One ACM certificate in us-east-1 covers both hostnames.
- **Ops:** secrets as SSM placeholders under one customer-managed KMS key, ECR repositories `supporters/{api,web,caddy}` (scan on push, immutable tags, keep 30 images, Inspector enhanced scanning), log groups with 30-day retention, alarms (server CPU, disk, memory and status; DB CPU, connections, storage and CPU credits; CloudFront 5xx rate) to SNS email, CloudTrail (multi-region, validated, KMS), GuardDuty (high-severity findings to SNS), AWS Budgets, and a GitHub OIDC deploy role per environment.
- **Staging:** the same modules with `t4g.small`, a short-lived database (1-day backups, no deletion protection), no snapshots, and an EventBridge schedule that stops the server and database at 22:00 IST and starts them at 08:00 IST (database an hour earlier).

## Cost estimate and the spec's table

Approximate on-demand Mumbai prices **from memory, not a quote** (the spec's own caveat); confirm in the AWS Pricing Calculator before sign-off. Per month, launch tier, production only:

| Line | Spec | This design | Notes |
| --- | --- | --- | --- |
| EC2 t4g.large, 40 GB gp3, Elastic IP | 40 (compute) | about 55–60 | Instance about $50, volume about $4, public IPv4 about $3.65. The spec's 40 looks low for on-demand; about 35 after a Savings Plan |
| RDS db.t4g.micro single-AZ, 20 GB gp3 | 15 | about 16 | Backups within the free allowance |
| Valkey on the server | 0 | 0 | |
| S3 + CloudFront | 5 | about 5 | CloudFront's free tier covers the first TB out |
| WAF | in "Other" | about 10 | Web ACL $5 + 5 rules at $1, plus $0.60 per million requests |
| Other (Route 53, KMS keys, CloudWatch, flow logs, GuardDuty, Inspector, ECR, snapshots, Secrets Manager) | 10 total with WAF | about 15–20 | Three KMS keys $3, GuardDuty and logs the rest |
| **Total** | **about 70** | **about 100–110** | |

The difference comes from the WAF and security services (GuardDuty, Inspector, flow logs, KMS keys) being priced explicitly, and from EC2 on-demand pricing; a Savings Plan and AWS Activate credits close part of the gap. The default `monthly_budget_usd` is therefore 100, not 70: set it to the number the client agrees, and tell them the expected range up front. Staging is not in the spec's table: about 35–40 per month with the nightly stop (the WAF alone is about $10; drop it from staging if that matters). Growth tier numbers (about 235) are not modelled here; the modules expose the knobs (`instance_type`, `db_instance_class`, `multi_az`) but an ALB, a second server and ElastiCache are not written yet.

## Deviations from, and ambiguities in, the spec

- **Caddy "automatic certificates" vs closed port 80.** The security group only admits CloudFront on 443, so Let's Encrypt HTTP-01 and TLS-ALPN cannot reach Caddy. The instance role gets a narrow Route 53 permission (TXT records named `_acme-challenge.origin.<domain>` only) for DNS-01, which needs Caddy built with `caddy-dns/route53` (hence the `caddy` ECR repository).
- **Chat attachments.** The brief says only `public/` is served; the backend spec requires 5-minute CloudFront signed URLs for chat. A `chat/*` behaviour with a trusted key group exists only when `chat_signing_public_key_pem` is set. `kyc/` is never behind CloudFront.
- **One CloudFront origin.** Caddy splits `/v1` from web, so "API origin" and "Next.js origin" are the same origin. `Host` is not forwarded (the origin certificate is for `origin.<domain>`), so apps must use `APP_ORIGIN`.
- **Not in the spec's role list:** the instance role also has Route 53 (above), `kms` on the bucket key (needed to sign presigned uploads) and ECR pull, which the brief lists.
- **IMDS hop limit 2** so containers can use the instance role; it also lets a compromised container reach the role.
- **WAF:** `SizeRestrictions_BODY` is count-only (the core rule blocks bodies over 8 KB; the API limits bodies to 1 MB itself). Rate limits are per IP and Indian carriers share addresses, hence the generous defaults. The media distribution has no WAF (static, cached, private bucket).
- **PDF `Content-Disposition: attachment`** must be set by the API as object metadata; CloudFront cannot do it per file type here.
- **Media URLs** are `https://media.<domain>/public/<key>` (the API builds `MEDIA_PUBLIC_URL + "/" + key`), so the distribution has no origin path.
- **ECR tags are immutable** and scanning is Inspector enhanced scanning, which bills per image. The deploy pipeline must push unique tags (git SHA), not `latest`.
- **Not provisioned:** p95 latency and queue-backlog alarms (spec) need application metrics that do not exist yet; Sentry and uptime monitoring are external. No CloudFront access logs, no ALB, no ElastiCache (growth tier).
- **DynamoDB locking** is deprecated in favour of S3 lock files; kept as the brief asks.
- **No automated `terraform apply`.** CI only runs static checks; applies are manual from an admin session.

## Client prerequisites

These extend the product spec's list ([Client prerequisites](../docs/specs/product-spec.md#client-prerequisites)). Items marked **infra** block the Terraform steps above.

- [ ] Domain name and DNS access. **infra:** the registrar must let us set name servers to the Route 53 zone (step 3)
- [ ] AWS account owned by the client, with IAM Identity Center access for the team. **infra:** root has MFA, a billing contact is set, and an admin permission set exists for whoever runs `terraform apply`
- [ ] Razorpay account with KYC complete, Subscriptions enabled and RazorpayX activated (keys go into SSM, step 8)
- [ ] MSG91 account plus TRAI DLT registration (entity, sender ID and OTP template approved)
- [ ] Amazon SES production access, plus SPF, DKIM and DMARC records on the sending domain. **infra:** Terraform creates the records; the client or we request production access in the SES console (Mumbai) once DKIM verifies
- [ ] Google Play Console account under the client's company (and Apple Developer, if iOS is in scope)
- [ ] Final legal texts: Terms, Privacy Policy, Refund Policy and Community Guidelines
- [ ] Starting category list (two levels) and brand assets
- [ ] Named staff for admin work (verification, moderation, payouts). **infra:** their office or VPN public IPs for the admin allow-list
- [ ] **infra:** ops mailbox(es) for alarms, GuardDuty and budget alerts, and an agreed monthly budget figure
- [ ] **infra:** the GitHub organisation and repository name that deploys (for the OIDC trust), and permission to create GitHub Environments with required reviewers
- [ ] **infra:** apply for AWS Activate credits before launch

## Static checks

`.github/workflows/infra.yml` runs `terraform fmt -check`, `terraform validate` (with `init -backend=false`, no credentials), `tflint` and `trivy config` on any PR that touches `infra/`. Accepted trivy findings are listed with reasons in [`.trivyignore.yaml`](.trivyignore.yaml). Locally, from `infra/terraform`: `terraform fmt -check -recursive` and `tflint --recursive`.
