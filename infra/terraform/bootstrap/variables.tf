variable "region" {
  description = "AWS region for the state bucket and lock table."
  type        = string
  default     = "ap-south-1"
}

variable "state_bucket_name" {
  description = "Globally unique name of the S3 bucket that holds Terraform state, for example supporters-tfstate-<account-id>."
  type        = string
}

variable "lock_table_name" {
  description = "Name of the DynamoDB table used for state locking."
  type        = string
  default     = "supporters-tfstate-lock"
}

variable "state_noncurrent_version_days" {
  description = "Days to keep old versions of state files, so a bad apply can be rolled back."
  type        = number
  default     = 90
}
