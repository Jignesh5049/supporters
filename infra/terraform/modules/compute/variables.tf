variable "name" {
  description = "Resource name prefix, for example supporters-production."
  type        = string
}

variable "instance_type" {
  description = "Graviton instance type: t4g.large at launch, t4g.small for staging."
  type        = string
  default     = "t4g.large"

  validation {
    condition     = can(regex("^[a-z]+[0-9]+g[a-z]*\\.", var.instance_type))
    error_message = "Use an arm64 (Graviton) instance type, for example t4g.large. The AMI is arm64."
  }
}

variable "subnet_id" {
  description = "Public subnet for the server."
  type        = string
}

variable "security_group_id" {
  description = "Security group of the app server (443 from CloudFront only)."
  type        = string
}

variable "root_volume_gb" {
  description = "Size of the encrypted gp3 root volume. Holds Docker images plus Valkey and Meilisearch data."
  type        = number
  default     = 40
}

variable "termination_protection" {
  description = "Block API termination of the instance."
  type        = bool
  default     = true
}

variable "snapshot_retention_days" {
  description = "Daily EBS snapshots kept by Data Lifecycle Manager. 0 turns snapshots off."
  type        = number
  default     = 7
}

variable "ssm_path" {
  description = "Parameter Store path the instance may read, for example /supporters/production."
  type        = string
}

variable "ssm_kms_key_arn" {
  description = "Customer-managed key that encrypts the SecureString parameters under ssm_path."
  type        = string
}

variable "log_group_prefix" {
  description = "Prefix of the CloudWatch log groups the instance may write to, for example /supporters/production."
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the media bucket. The instance may use only the public/, chat/ and kyc/ prefixes."
  type        = string
}

variable "ses_identity_arns" {
  description = "SES identity ARNs the instance may send from."
  type        = list(string)
}

variable "ecr_repository_arns" {
  description = "ECR repository ARN patterns the instance may pull from, for example arn:aws:ecr:ap-south-1:<account>:repository/supporters/*."
  type        = list(string)
}

variable "ecr_registry" {
  description = "ECR registry host used by the login helper, <account>.dkr.ecr.<region>.amazonaws.com."
  type        = string
}

variable "acme_route53_zone_arn" {
  description = "Hosted zone ARN Caddy may use for DNS-01 certificate challenges. Empty disables the permission."
  type        = string
  default     = ""
}

variable "acme_challenge_record_names" {
  description = "Exact record names Caddy may change, lower case and without a trailing dot, for example [\"_acme-challenge.origin.<domain>\"]."
  type        = list(string)
  default     = []
}

variable "docker_compose_version" {
  description = "Docker Compose plugin release installed on the host (verified against the published sha256)."
  type        = string
  default     = "v5.7.1"
}
