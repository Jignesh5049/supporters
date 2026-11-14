output "instance_id" {
  description = "App server instance id. Connect with: aws ssm start-session --target <id>."
  value       = module.compute.instance_id
}

output "server_public_ip" {
  description = "Elastic IP of the app server."
  value       = module.compute.public_ip
}

output "db_address" {
  description = "RDS endpoint (private)."
  value       = module.database.address
}

output "db_master_secret_arn" {
  description = "Secrets Manager secret that holds the RDS master credentials (ARN only)."
  value       = module.database.master_secret_arn
}

output "ssm_path" {
  description = "Parameter Store prefix for this environment's secrets and config."
  value       = local.ssm_path
}

output "media_bucket" {
  description = "Name of the private media bucket."
  value       = module.storage.bucket_id
}

output "app_distribution_id" {
  description = "CloudFront distribution of the app (<domain>)."
  value       = module.edge.app_distribution_id
}

output "media_distribution_id" {
  description = "CloudFront distribution of media.<domain>."
  value       = module.edge.media_distribution_id
}

output "chat_public_key_id" {
  description = "CloudFront public key id for signing chat URLs (null until chat_signing_public_key_pem is set)."
  value       = module.edge.chat_public_key_id
}

output "github_deploy_role_arn" {
  description = "Role for GitHub Actions (OIDC) to assume when deploying to production."
  value       = module.deploy_access.role_arn
}

output "ecr_repository_urls" {
  description = "ECR repository URL per image."
  value       = module.registry.repository_urls
}
