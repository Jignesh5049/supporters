output "role_arn" {
  description = "Role ARN for the `role-to-assume` input of aws-actions/configure-aws-credentials."
  value       = aws_iam_role.deploy.arn
}
