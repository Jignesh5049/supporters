output "instance_id" {
  description = "EC2 instance id (target for SSM Session Manager and Run Command)."
  value       = aws_instance.this.id
}

output "instance_arn" {
  description = "EC2 instance ARN."
  value       = aws_instance.this.arn
}

output "public_ip" {
  description = "Elastic IP of the server. The origin DNS record points here."
  value       = aws_eip.this.public_ip
}

output "role_arn" {
  description = "ARN of the instance role."
  value       = aws_iam_role.this.arn
}
