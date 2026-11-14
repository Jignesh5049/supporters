output "identifier" {
  description = "DB instance identifier."
  value       = aws_db_instance.this.identifier
}

output "arn" {
  description = "DB instance ARN."
  value       = aws_db_instance.this.arn
}

output "address" {
  description = "Hostname of the instance (resolves to a private IP inside the VPC)."
  value       = aws_db_instance.this.address
}

output "port" {
  description = "Port of the instance."
  value       = aws_db_instance.this.port
}

output "master_secret_arn" {
  description = "ARN of the Secrets Manager secret that holds the master credentials. Only the ARN is exposed, never the value."
  value       = aws_db_instance.this.master_user_secret[0].secret_arn
}
