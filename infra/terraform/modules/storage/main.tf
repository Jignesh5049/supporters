# One private bucket. Objects are grouped by key prefix:
#   public/  avatars, covers, listing and post media. Served only through media.<domain>.
#   chat/    chat attachments. Never public; short-lived CloudFront signed URLs.
#   kyc/     verification documents. Never behind CloudFront; 5-minute S3 presigned links for admins.
# The prefixes are conventions enforced by IAM and the bucket policy, not objects Terraform creates.
resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name

  # Real user uploads and KYC documents: refuse `terraform destroy` while the bucket exists.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_ownership_controls" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status = "Enabled"
  }
}

# SSE-KMS with a customer-managed key keeps the uploaded files encrypted at rest, and CloudFront
# can still read them: the key policy below lets the CloudFront service decrypt on behalf of
# this account's distributions.
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.this.arn
    }
    bucket_key_enabled = true
  }
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}

data "aws_iam_policy_document" "kms" {
  statement {
    sid       = "EnableIamPolicies"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }

  statement {
    sid       = "AllowCloudFrontToDecryptMedia"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey*"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "aws:SourceArn"
      values   = ["arn:${data.aws_partition.current.partition}:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/*"]
    }
  }
}

resource "aws_kms_key" "this" {
  description             = "${var.bucket_name} object encryption"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.kms.json
}

resource "aws_kms_alias" "this" {
  name          = "alias/${var.bucket_name}"
  target_key_id = aws_kms_key.this.key_id
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  # Failed or abandoned presigned multipart uploads must not accumulate storage.
  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  # Versioning protects against accidental deletes; old versions are kept for a month, then removed.
  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days           = var.noncurrent_version_days
      newer_noncurrent_versions = 3
    }
  }

  rule {
    id     = "remove-expired-delete-markers"
    status = "Enabled"

    filter {}

    expiration {
      expired_object_delete_marker = true
    }
  }

  # Public media is read often at first and rarely later; Intelligent-Tiering moves it automatically.
  rule {
    id     = "public-to-intelligent-tiering"
    status = "Enabled"

    filter {
      prefix = "public/"
    }

    transition {
      days          = var.public_tiering_after_days
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}

# Browsers and the apps upload with presigned PUT URLs straight to S3, which is cross-origin.
resource "aws_s3_bucket_cors_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  cors_rule {
    allowed_methods = ["PUT"]
    allowed_origins = var.cors_allowed_origins
    allowed_headers = ["Content-Type", "Content-Length", "x-amz-*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Base policy: TLS only. The edge module layers the CloudFront read grants on top of this
# document, because they need the distribution ARNs (a bucket can have only one policy).
data "aws_iam_policy_document" "base" {
  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.this.arn, "${aws_s3_bucket.this.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}
