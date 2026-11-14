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

variable "admin_allowed_ipv4_cidrs" {
  description = "IPv4 CIDRs allowed to reach /admin* and /v1/admin/* (client staff offices or a VPN). Empty blocks everyone."
  type        = list(string)
  default     = []
}

variable "admin_allowed_ipv6_cidrs" {
  description = "IPv6 CIDRs allowed to reach /admin* and /v1/admin/*."
  type        = list(string)
  default     = []
}

variable "chat_signing_public_key_pem" {
  description = "Public half of the key pair that signs 5-minute chat attachment URLs. Generate it out of band (openssl) and keep the private key in SSM. Empty leaves chat/ unserved."
  type        = string
  default     = ""
}

variable "cloudfront_price_class" {
  description = "CloudFront price class. PriceClass_200 includes India."
  type        = string
  default     = "PriceClass_200"
}

variable "auth_rate_limit" {
  description = "WAF: requests per client IP per 5 minutes to /v1/auth/* before blocking."
  type        = number
  default     = 300
}

variable "alert_emails" {
  description = "Addresses that receive CloudWatch alarm, GuardDuty and budget emails. Each must confirm the SNS subscription once."
  type        = list(string)
}

variable "monthly_budget_usd" {
  description = "Monthly cost target in USD. AWS Budgets alerts at 80% and 100%. The spec's launch estimate is about 70; leave room for traffic."
  type        = number
  default     = 100
}

variable "github_repository" {
  description = "GitHub repository (<org>/<repo>) whose production environment may assume the deploy role."
  type        = string
}

variable "dmarc_report_email" {
  description = "Mailbox for DMARC aggregate reports. Empty omits the rua tag."
  type        = string
  default     = ""
}
