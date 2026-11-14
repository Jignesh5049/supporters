output "alerts_topic_arn" {
  description = "SNS topic that receives alarms (ap-south-1)."
  value       = aws_sns_topic.alerts.arn
}

output "log_group_names" {
  description = "Names of the application log groups."
  value       = [for group in aws_cloudwatch_log_group.app : group.name]
}
