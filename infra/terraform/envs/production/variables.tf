variable "region" {
  description = "Primary AWS region (Mumbai)."
  type        = string
  default     = "ap-south-1"
}

variable "domain" {
  description = "Public Route 53 hosted zone name the client owns, for example example.com. Appears as <domain> in the specs. The zone must already exist (see infra/README.md)."
  type        = string
}

variable "instance_type" {
  description = "App server size. t4g.large at launch."
  type        = string
  default     = "t4g.large"
}

variable "db_instance_class" {
  description = "RDS instance class. db.t4g.micro at launch."
  type        = string
  default     = "db.t4g.micro"
}

variable "ecr_repository_prefix" {
  description = "Namespace of the ECR repositories (<prefix>/api, <prefix>/web, ...). Shared by staging and production."
  type        = string
  default     = "supporters"
}

variable "origin_verify_rotation" {
  description = "Change (for example 2027-Q1) to rotate the X-Origin-Verify secret. The spec rotates it quarterly."
  type        = string
  default     = "initial"
}

variable "secret_names" {
  description = "SecureString parameters created as empty placeholders under /supporters/production/. Values are set out of band."
  type        = list(string)
  default = [
    "DATABASE_URL",
    "VALKEY_PASSWORD",
    "JWT_PRIVATE_KEY",
    "JWT_KEY_ID",
    "OTP_HMAC_KEY",
    "TOTP_ENCRYPTION_KEY",
    "PAYOUT_ENCRYPTION_KEY",
    "MEILI_MASTER_KEY",
    "MEILI_SEARCH_KEY",
    "MEILI_INDEX_KEY",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "RAZORPAY_WEBHOOK_SECRET",
    "RAZORPAYX_KEY_ID",
    "RAZORPAYX_KEY_SECRET",
    "RAZORPAYX_ACCOUNT_NUMBER",
    "MSG91_AUTH_KEY",
    "VAPID_PRIVATE_KEY",
    "EXPO_ACCESS_TOKEN",
    "SENTRY_DSN",
    "CLOUDFRONT_SIGNING_PRIVATE_KEY",
    "CLOUDFRONT_KEY_PAIR_ID",
  ]
}
