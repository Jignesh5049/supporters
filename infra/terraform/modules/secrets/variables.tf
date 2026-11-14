variable "name" {
  description = "Resource name prefix, for example supporters-production."
  type        = string
}

variable "ssm_path" {
  description = "Parameter Store path prefix for this environment, for example /supporters/production. The instance role may read only this path."
  type        = string
}

variable "config_values" {
  description = "Non-secret configuration published as plain String parameters (bucket name, public URLs and so on), so the server renders its environment from one place."
  type        = map(string)
  default     = {}
}

variable "origin_verify_rotation" {
  description = "Change this string (for example 2027-Q1) to rotate the X-Origin-Verify secret. The spec rotates it quarterly."
  type        = string
  default     = "initial"
}

variable "secret_names" {
  description = "SecureString parameters created as empty placeholders under the environment path. Values are set out of band."
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
  ]
}
