output "trail_bucket" {
  description = "Bucket that holds the CloudTrail logs."
  value       = aws_s3_bucket.trail.id
}

output "guardduty_detector_id" {
  description = "GuardDuty detector id."
  value       = aws_guardduty_detector.this.id
}
