output "app_distribution_id" {
  description = "Id of the app distribution (<domain>). Used by the 5xx alarm and cache invalidations."
  value       = aws_cloudfront_distribution.app.id
}

output "app_distribution_arn" {
  description = "ARN of the app distribution."
  value       = aws_cloudfront_distribution.app.arn
}

output "media_distribution_id" {
  description = "Id of the media distribution (media.<domain>)."
  value       = aws_cloudfront_distribution.media.id
}

output "chat_key_group_id" {
  description = "Key group that signs chat attachment URLs; null while chat_signing_public_key_pem is empty."
  value       = local.signed_chat ? aws_cloudfront_key_group.chat[0].id : null
}

output "chat_public_key_id" {
  description = "Id of the CloudFront public key. The API passes it as the Key-Pair-Id of signed URLs; null while unset."
  value       = local.signed_chat ? aws_cloudfront_public_key.chat[0].id : null
}

output "web_acl_arn" {
  description = "ARN of the WAF web ACL."
  value       = aws_wafv2_web_acl.this.arn
}
