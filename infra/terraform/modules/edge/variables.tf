variable "name" {
  description = "Resource name prefix, for example supporters-production."
  type        = string
}

variable "zone_id" {
  description = "Route 53 hosted zone id of the client's domain."
  type        = string
}

variable "app_domain" {
  description = "Hostname of the app distribution (web plus /v1 API): <domain> in production."
  type        = string
}

variable "media_domain" {
  description = "Hostname of the media distribution: media.<domain>. Kept separate from the app domain so an uploaded file can never run as script on the app's origin."
  type        = string
}

variable "origin_domain" {
  description = "Hostname that CloudFront connects to (origin.<domain>), pointing at the server. Caddy holds a certificate for it."
  type        = string
}

variable "origin_ip" {
  description = "Elastic IP of the app server, published as the A record of origin_domain."
  type        = string
}

variable "origin_verify_value" {
  description = "Secret sent to the origin as the X-Origin-Verify header. Caddy drops requests without it."
  type        = string
  sensitive   = true
}

variable "bucket_id" {
  description = "Media bucket name."
  type        = string
}

variable "bucket_arn" {
  description = "Media bucket ARN."
  type        = string
}

variable "bucket_regional_domain_name" {
  description = "Media bucket regional domain name (CloudFront S3 origin)."
  type        = string
}

variable "bucket_base_policy_json" {
  description = "Base bucket policy (TLS only) that this module extends with the CloudFront read grants."
  type        = string
}

variable "price_class" {
  description = "CloudFront price class. PriceClass_200 includes the Indian edge locations without the most expensive regions."
  type        = string
  default     = "PriceClass_200"
}

variable "admin_allowed_ipv4_cidrs" {
  description = "IPv4 CIDRs allowed to reach /admin* and /v1/admin/*. Everyone else is blocked at the edge. Empty means nobody (fail closed)."
  type        = list(string)
  default     = []
}

variable "admin_allowed_ipv6_cidrs" {
  description = "IPv6 CIDRs allowed to reach /admin* and /v1/admin/*."
  type        = list(string)
  default     = []
}

variable "auth_rate_limit" {
  description = "Maximum requests to /v1/auth/* per client IP per 5 minutes before WAF blocks it. Mobile carriers share IPs (CGNAT), so keep this generous; the API enforces the per-account limits."
  type        = number
  default     = 300
}

variable "global_rate_limit" {
  description = "Maximum requests of any kind per client IP per 5 minutes. A coarse flood guard, far above normal use."
  type        = number
  default     = 3000
}

variable "chat_signing_public_key_pem" {
  description = "PEM public key whose private half the API uses to sign 5-minute chat attachment URLs. Empty leaves chat/ unserved by CloudFront entirely."
  type        = string
  default     = ""
}

variable "waf_log_retention_days" {
  description = "Retention of the WAF log group (authorization and cookie headers are redacted)."
  type        = number
  default     = 30
}
