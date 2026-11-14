output "kms_key_arn" {
  description = "ARN of the environment's customer-managed key."
  value       = aws_kms_key.main.arn
}

output "origin_verify_value" {
  description = "Secret CloudFront sends in the X-Origin-Verify header."
  value       = random_password.origin_verify.result
  sensitive   = true
}

output "ssm_path" {
  description = "Parameter Store path prefix."
  value       = var.ssm_path
}
