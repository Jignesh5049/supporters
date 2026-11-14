output "schedule_names" {
  description = "Names of the EventBridge schedules."
  value       = [for schedule in aws_scheduler_schedule.this : schedule.name]
}
