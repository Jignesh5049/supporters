output "bucket_id" {
  description = "Bucket name."
  value       = aws_s3_bucket.this.id
}

output "bucket_arn" {
  description = "Bucket ARN."
  value       = aws_s3_bucket.this.arn
}

output "bucket_regional_domain_name" {
  description = "Regional domain name used as the CloudFront origin."
  value       = aws_s3_bucket.this.bucket_regional_domain_name
}

output "base_policy_json" {
  description = "Bucket policy document (TLS only) for the edge module to extend with CloudFront read grants."
  value       = data.aws_iam_policy_document.base.json
}

output "kms_key_arn" {
  description = "Key that encrypts the bucket. The API role needs kms:Decrypt and kms:GenerateDataKey on it."
  value       = aws_kms_key.this.arn
}
