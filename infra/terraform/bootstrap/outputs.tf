output "state_bucket" {
  description = "Bucket name for the `bucket` key in each environment's backend.hcl."
  value       = aws_s3_bucket.state.id
}

output "lock_table" {
  description = "Table name for the `dynamodb_table` key in each environment's backend.hcl."
  value       = aws_dynamodb_table.lock.name
}

output "region" {
  description = "Region for the `region` key in each environment's backend.hcl."
  value       = var.region
}

output "github_oidc_provider_arn" {
  description = "The account's GitHub OIDC provider. Environment stacks derive this ARN themselves; it is listed here for reference."
  value       = aws_iam_openid_connect_provider.github.arn
}

output "account_id" {
  description = "The AWS account this stack was applied to."
  value       = data.aws_caller_identity.current.account_id
}

output "state_kms_key_arn" {
  description = "Key for the `kms_key_id` entry in each environment's backend.hcl."
  value       = aws_kms_key.state.arn
}
