# Supporters infrastructure

Terraform for the launch tier described in the product spec ([Hosting on AWS](../docs/specs/product-spec.md#hosting-on-aws)): one Graviton EC2 server plus managed AWS services in Mumbai (`ap-south-1`), at roughly $70/month. **This directory only describes infrastructure. Nothing here has been applied**; no AWS account exists yet.

## Layout

```
infra/
  terraform/
    bootstrap/          one-off stack: remote-state bucket, lock table, GitHub OIDC provider
    modules/
      secrets/          KMS key, SSM Parameter Store placeholders, X-Origin-Verify secret
      storage/          private media bucket, KMS key, lifecycle, CORS
      network/          VPC, subnets, S3 gateway endpoint, security groups, flow logs (no NAT)
      compute/          EC2 t4g, instance profile, Elastic IP, user data, EBS snapshots
      database/         RDS PostgreSQL 18, parameter group (TLS required), backups
      edge/             CloudFront (app + media), WAF, ACM, Route 53 records
    envs/
      production/       root module for production (one state file)
```

Ops modules and the staging root arrive in the last PR of this stack.

## Environments: separate roots, not workspaces

Production and staging are separate root modules under `envs/`, each with its own state file, instead of one root with Terraform workspaces.

- **Blast radius.** A mistaken `apply` in the wrong workspace is easy to make and hits production. With separate directories you `cd` into the environment you mean, and the state key (`production/…` vs `staging/…`) is explicit.
- **They are allowed to differ.** Staging has a nightly stop schedule, a smaller server and no account-level resources (CloudTrail, GuardDuty, budgets); workspaces would need `count = terraform.workspace == "production" ? 1 : 0` conditions everywhere.
- **Reviewable.** A PR that touches `envs/staging` cannot alter production by accident, and CI validates each root on its own.

Both roots call the same modules, so the two environments cannot drift apart in structure.

## State bootstrap

Remote state lives in S3 (versioned, encrypted, private, TLS-only) with a DynamoDB table for locking. They are created by the small `bootstrap/` stack, which keeps its own state locally because the bucket does not exist yet. The same stack creates the account's GitHub OIDC identity provider.

```bash
export AWS_PROFILE=<identity-center-profile>   # an admin session; no long-lived keys
export TF_PLUGIN_CACHE_DIR=<repo-drive>/.terraform-plugin-cache   # keep provider downloads off C:
mkdir -p "$TF_PLUGIN_CACHE_DIR"

cd infra/terraform/bootstrap
cp example.tfvars terraform.tfvars    # set state_bucket_name; git-ignored
terraform init
terraform apply
```

Copy the outputs (bucket, lock table, region and the state KMS key) into `envs/<env>/backend.hcl` (from `example.backend.hcl`), then `terraform init -backend-config=backend.hcl` in the environment. Back up the bootstrap `terraform.tfstate` (it is small and rarely changes), or move it into the new bucket by adding an `s3` backend block and running `terraform init -migrate-state`.

Terraform 1.11+ can lock with a lock file in S3 (`use_lockfile = true`) and deprecates DynamoDB locking. The DynamoDB table is kept because the brief asks for it and it costs nothing at this scale; switching later is a one-line change in `backend.hcl`.

## Network, compute and database (this PR)

- **Network:** VPC `10.20.0.0/16` with two public subnets (app server) and two private subnets (RDS, no default route). **No NAT Gateway.** A free S3 gateway endpoint serves S3 traffic. The app server's security group accepts 443 only from CloudFront's managed prefix list `com.amazonaws.global.cloudfront.origin-facing`, and there is no SSH rule: use SSM Session Manager (`aws ssm start-session --target <instance-id>`). RDS accepts 5432 only from the app server's security group. VPC flow logs go to an encrypted 30-day log group.
- **Compute:** one `t4g.large` on Amazon Linux 2023 arm64, encrypted gp3 root volume, IMDSv2 required, an Elastic IP and daily EBS snapshots (7 kept). The instance role may use only its own S3 bucket prefixes, SES sending from the product domain, its own SSM path (and the key that encrypts it), CloudWatch metrics and logs under its own prefix, ECR pull, and Caddy's DNS challenge record. User data installs Docker, the Compose plugin (checksum-verified) and the CloudWatch agent. **TODO:** the compose file `deploy/compose.prod.yml` comes from the containers and deploy-pipeline work; the pipeline copies it to `/opt/supporters/compose.yml` over SSM Run Command.
- **Database:** RDS PostgreSQL 18, `db.t4g.micro`, single-AZ, 20 GB gp3 (autoscaling to 100 GB), encrypted, private, `rds.force_ssl=1`, 7-day backups (point-in-time recovery), deletion protection on. RDS generates the master password and keeps it in Secrets Manager (`manage_master_user_password`), so the password is never in Terraform state or outputs. The app should not run as the master user: create a least-privilege role by hand (below) and store its URL in SSM.
- **Secrets:** `secrets/` creates a customer-managed KMS key and empty `SecureString` placeholders under `/supporters/<env>/…`. Terraform ignores their values after creation, so setting a real value with `aws ssm put-parameter --overwrite` is never reverted. It also generates the `X-Origin-Verify` secret.

### Creating the application database role

After the first apply, from a Session Manager session on the server (the database is reachable only from there):

```bash
aws secretsmanager get-secret-value --secret-id <db_master_secret_arn> --query SecretString --output text
# connect with psql using that user/password, then:
#   CREATE ROLE supporters_app LOGIN PASSWORD '<generated>';
#   GRANT ... (see the API's Prisma migration notes)
# Store postgresql://supporters_app:<password>@<db-host>:5432/supporters?sslmode=verify-full
# in SSM as /supporters/<env>/DATABASE_URL.
```

`sslmode=verify-full` needs the RDS CA bundle (`rds-ca-rsa2048-g1`, from <https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem>) inside the API container; that belongs in the Dockerfile.


## Storage and edge (PR 2)

- **Storage:** one private bucket, `<name>-media-<account-id>`, with versioning (old versions kept 30 days), SSE-KMS with its own customer-managed key, all four public-access blocks, `BucketOwnerEnforced`, a TLS-only policy, abort-incomplete-multipart and Intelligent-Tiering lifecycle rules, and CORS for presigned `PUT` from `https://<domain>`. The prefixes are conventions enforced by IAM and the bucket policy: `public/` (served), `chat/` (signed URLs only) and `kyc/` (S3 presigned links for admins, never behind CloudFront).
- **App distribution (`<domain>`):** a single origin, `origin.<domain>` (Caddy on the server, HTTPS only), with the secret `X-Origin-Verify` header. `/v1/ws*` and `/v1/*` are never cached and forward every cookie, header and query string; `/_next/static/*` is cached immutably for a year; everything else goes to Next.js uncached. The `Host` header is deliberately not forwarded (the origin certificate is for `origin.<domain>`); the apps use `APP_ORIGIN`.
- **Media distribution (`media.<domain>`):** private bucket through Origin Access Control. The bucket policy lets that distribution read `public/*` only, so `kyc/*` is refused by S3 even if someone requests it. Chat attachments are served from `chat/*` only when `chat_signing_public_key_pem` is set; the behaviour then requires a CloudFront signed URL (trusted key group). Responses carry `X-Content-Type-Options: nosniff`, HSTS and a sandboxing CSP.
- **WAF (CloudFront scope, us-east-1):** an IP allow-list rule for `/admin*` and `/v1/admin*` (fail-closed when the list is empty), a rate rule on `/v1/auth/*`, a coarse global rate rule, the AWS managed Core rule set (with `SizeRestrictions_BODY` set to count) and the Known Bad Inputs set. Logs go to a 30-day log group with `authorization` and `cookie` redacted.
- **Certificates and DNS:** one ACM certificate in us-east-1 for `<domain>` and `media.<domain>`, validated by DNS in the client's hosted zone; A/AAAA alias records for both distributions and an A record for `origin.<domain>`.

### Generating the chat signing key pair

```bash
openssl genrsa -out chat-signing-private.pem 2048
openssl rsa -pubout -in chat-signing-private.pem -out chat-signing-public.pem
# Put the PUBLIC key in terraform.tfvars as chat_signing_public_key_pem.
# Put the PRIVATE key in SSM as /supporters/<env>/CLOUDFRONT_SIGNING_PRIVATE_KEY, then delete the file.
```

## Static checks

`.github/workflows/infra.yml` runs `terraform fmt -check`, `terraform validate` (with `init -backend=false`), `tflint` and `trivy config` on any PR that touches `infra/`. Accepted trivy findings are listed with reasons in [`.trivyignore.yaml`](.trivyignore.yaml). Run the same locally from `infra/terraform` with `terraform fmt -check -recursive` and `tflint --recursive`.
