data "aws_caller_identity" "current" {}

locals {
  environment = "production"
  name        = "supporters-${local.environment}"
  ssm_path    = "/supporters/${local.environment}"
  account_id  = data.aws_caller_identity.current.account_id

  # <domain> in the specs: the app and API live on the zone apex, media and the origin on subdomains.
  app_domain    = var.domain
  media_domain  = "media.${var.domain}"
  origin_domain = "origin.${var.domain}"

  # Known up front so the instance role can reference the bucket before the bucket module exists.
  media_bucket_name = "${local.name}-media-${local.account_id}"
  ecr_registry      = "${local.account_id}.dkr.ecr.${var.region}.amazonaws.com"
}

# The hosted zone is created by hand once, because delegating its name servers at the registrar
# is a manual step that must finish before certificates can validate.
data "aws_route53_zone" "this" {
  name         = var.domain
  private_zone = false
}

module "secrets" {
  source = "../../modules/secrets"

  name                   = local.name
  ssm_path               = local.ssm_path
  secret_names           = var.secret_names
  origin_verify_rotation = var.origin_verify_rotation

  config_values = {
    NODE_ENV          = local.environment
    APP_ORIGIN        = "https://${local.app_domain}"
    TRUST_PROXY       = "2" # CloudFront + Caddy
    S3_BUCKET         = local.media_bucket_name
    S3_REGION         = var.region
    MEDIA_PUBLIC_URL  = "https://${local.media_domain}"
    EMAIL_PROVIDER    = "ses"
    EMAIL_FROM        = "no-reply@${var.domain}"
    SES_REGION        = var.region
    DB_HOST           = module.database.address
    DB_PORT           = tostring(module.database.port)
    DB_NAME           = "supporters"
    DB_MASTER_SECRET  = module.database.master_secret_arn
    ORIGIN_DOMAIN     = local.origin_domain
    ACME_DNS_ZONE_ID  = data.aws_route53_zone.this.zone_id
    SSM_PATH          = local.ssm_path
    ECR_REGISTRY      = local.ecr_registry
    ECR_REPOSITORY_NS = var.ecr_repository_prefix

    CLOUDFRONT_KEY_PAIR_ID = coalesce(module.edge.chat_public_key_id, "not-configured")
  }
}

module "network" {
  source = "../../modules/network"

  name                 = local.name
  flow_log_kms_key_arn = module.secrets.kms_key_arn
}

module "compute" {
  source = "../../modules/compute"

  name              = local.name
  instance_type     = var.instance_type
  subnet_id         = module.network.public_subnet_ids[0]
  security_group_id = module.network.app_security_group_id

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
