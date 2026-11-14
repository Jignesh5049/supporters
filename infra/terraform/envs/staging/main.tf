data "aws_caller_identity" "current" {}

locals {
  environment = "staging"
  name        = "supporters-${local.environment}"
  ssm_path    = "/supporters/${local.environment}"
  account_id  = data.aws_caller_identity.current.account_id

  # Staging lives in the same hosted zone, on its own hostnames. Seeded fake data only.
  app_domain    = "staging.${var.domain}"
  media_domain  = "media-staging.${var.domain}"
  origin_domain = "origin-staging.${var.domain}"

  media_bucket_name = "${local.name}-media-${local.account_id}"
  ecr_registry      = "${local.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}

# The zone is shared with production; see infra/README.md for creating it.
data "aws_route53_zone" "this" {
  name         = var.domain
  private_zone = false
}

module "secrets" {
  source = "../../modules/secrets"

  name                   = local.name
  ssm_path               = local.ssm_path
  origin_verify_rotation = var.origin_verify_rotation

  config_values = {
    NODE_ENV               = local.environment
    APP_ORIGIN             = "https://${local.app_domain}"
    TRUST_PROXY            = "2" # CloudFront + Caddy
    S3_BUCKET              = local.media_bucket_name
    S3_REGION              = var.region
    MEDIA_PUBLIC_URL       = "https://${local.media_domain}"
    EMAIL_PROVIDER         = "ses"
    EMAIL_FROM             = "no-reply@${var.domain}"
    SES_REGION             = var.region
    DB_HOST                = module.database.address
    DB_PORT                = tostring(module.database.port)
    DB_NAME                = "supporters"
    DB_MASTER_SECRET       = module.database.master_secret_arn
    ORIGIN_DOMAIN          = local.origin_domain
    ACME_DNS_ZONE_ID       = data.aws_route53_zone.this.zone_id
    SSM_PATH               = local.ssm_path
    ECR_REGISTRY           = local.ecr_registry
    ECR_REPOSITORY_NS      = var.ecr_repository_prefix
    CLOUDFRONT_KEY_PAIR_ID = coalesce(module.edge.chat_public_key_id, "not-configured")
  }
}

module "network" {
  source = "../../modules/network"

  name                 = local.name
  vpc_cidr             = "10.30.0.0/16"
  public_subnet_cidrs  = ["10.30.0.0/24", "10.30.1.0/24"]
  private_subnet_cidrs = ["10.30.10.0/24", "10.30.11.0/24"]
  flow_log_kms_key_arn = module.secrets.kms_key_arn
}

module "compute" {
  source = "../../modules/compute"

  name              = local.name
  instance_type     = var.instance_type
  subnet_id         = module.network.public_subnet_ids[0]
  security_group_id = module.network.app_security_group_id

  # Staging holds only seeded fake data and is rebuilt freely: no termination protection, no snapshots.
  root_volume_gb          = 30
  termination_protection  = false
  snapshot_retention_days = 0

  ssm_path         = local.ssm_path
  ssm_kms_key_arn  = module.secrets.kms_key_arn
  log_group_prefix = local.ssm_path

  s3_bucket_arn       = "arn:aws:s3:::${local.media_bucket_name}"
  s3_kms_key_arn      = module.storage.kms_key_arn
  ses_identity_arns   = ["arn:aws:ses:${var.region}:${local.account_id}:identity/${var.domain}"]
  ecr_repository_arns = ["arn:aws:ecr:${var.region}:${local.account_id}:repository/${var.ecr_repository_prefix}/*"]
  ecr_registry        = local.ecr_registry

  acme_route53_zone_arn       = data.aws_route53_zone.this.arn
  acme_challenge_record_names = ["_acme-challenge.${local.origin_domain}"]
}

module "database" {
  source = "../../modules/database"

  name              = local.name
  subnet_ids        = module.network.private_subnet_ids
  security_group_id = module.network.db_security_group_id
  instance_class    = var.db_instance_class

  # Fake data: short backups, and the instance can be deleted without a final snapshot.
  max_allocated_storage_gb = 40
  backup_retention_days    = 1
  deletion_protection      = false
  skip_final_snapshot      = true
}

module "storage" {
  source = "../../modules/storage"

  bucket_name          = local.media_bucket_name
  cors_allowed_origins = ["https://${local.app_domain}"]
}

module "edge" {
  source = "../../modules/edge"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name          = local.name
  zone_id       = data.aws_route53_zone.this.zone_id
  app_domain    = local.app_domain
  media_domain  = local.media_domain
  origin_domain = local.origin_domain
  origin_ip     = module.compute.public_ip

  origin_verify_value = module.secrets.origin_verify_value

  bucket_id                   = module.storage.bucket_id
  bucket_arn                  = module.storage.bucket_arn
  bucket_regional_domain_name = module.storage.bucket_regional_domain_name
  bucket_base_policy_json     = module.storage.base_policy_json

  price_class                 = var.cloudfront_price_class
  admin_allowed_ipv4_cidrs    = var.admin_allowed_ipv4_cidrs
  admin_allowed_ipv6_cidrs    = var.admin_allowed_ipv6_cidrs
  auth_rate_limit             = var.auth_rate_limit
  chat_signing_public_key_pem = var.chat_signing_public_key_pem
}

module "monitoring" {
  source = "../../modules/monitoring"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name             = local.name
  log_group_prefix = local.ssm_path
  kms_key_arn      = module.secrets.kms_key_arn
  alert_emails     = var.alert_emails

  instance_id                = module.compute.instance_id
  db_identifier              = module.database.identifier
  cloudfront_distribution_id = module.edge.app_distribution_id

  # The server is stopped every night, so silence from its agent is normal.
  server_may_be_stopped = var.night_schedule_enabled
}

module "deploy_access" {
  source = "../../modules/deploy-access"

  name                = local.name
  github_repository   = var.github_repository
  github_subjects     = ["environment:${local.environment}"]
  ecr_repository_arns = ["arn:aws:ecr:${var.region}:${local.account_id}:repository/${var.ecr_repository_prefix}/*"]
  instance_arn        = module.compute.instance_arn
}

module "night_schedule" {
  source = "../../modules/night-schedule"

  name          = local.name
  instance_id   = module.compute.instance_id
  instance_arn  = module.compute.instance_arn
  db_identifier = module.database.identifier
  db_arn        = module.database.arn
  stop_hour     = var.night_schedule_stop_hour
  start_hour    = var.night_schedule_start_hour
  enabled       = var.night_schedule_enabled
}
