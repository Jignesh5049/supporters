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
