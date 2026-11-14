variable "name" {
  description = "Resource name prefix for the account baseline, for example supporters."
  type        = string
}

variable "kms_key_arn" {
  description = "Customer-managed key (its policy must allow CloudTrail) that encrypts the trail."
  type        = string
}

variable "alerts_topic_arn" {
  description = "SNS topic that receives high-severity GuardDuty findings."
  type        = string
}

variable "monthly_budget_usd" {
  description = "Monthly cost target in USD. Budget alerts fire at 80% and 100% of it. The spec's launch estimate is about 70."
  type        = number
}

variable "budget_emails" {
  description = "Addresses that receive budget alerts."
  type        = list(string)
}

variable "trail_retention_days" {
  description = "Days CloudTrail logs are kept in S3."
  type        = number
  default     = 365
}
