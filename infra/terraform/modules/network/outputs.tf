output "vpc_id" {
  description = "VPC id."
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "Public subnet ids (app server)."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "Private subnet ids (RDS)."
  value       = aws_subnet.private[*].id
}

output "app_security_group_id" {
  description = "Security group of the app server."
  value       = aws_security_group.app.id
}

output "db_security_group_id" {
  description = "Security group of the database."
  value       = aws_security_group.db.id
}
