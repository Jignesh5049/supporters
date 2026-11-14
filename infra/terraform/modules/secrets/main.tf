data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
data "aws_partition" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region
  partition  = data.aws_partition.current.partition
}

# ---------------------------------------------------------------------------
# Customer-managed key for SecureString parameters, log groups and CloudTrail
# ---------------------------------------------------------------------------
# A CMK (not the default aws/ssm key) lets IAM policies grant decrypt on exactly this key, and
# lets us audit every use in CloudTrail. Costs about $1/month.
data "aws_iam_policy_document" "kms" {
  statement {
    sid       = "EnableIamPolicies"
    effect    = "Allow"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:${local.partition}:iam::${local.account_id}:root"]
    }
  }

  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"
    actions = [
      "kms:Encrypt*",
      "kms:Decrypt*",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:Describe*",
    ]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["logs.${local.region}.amazonaws.com"]
    }

    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values   = ["arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:*"]
    }
  }

  statement {
    sid       = "AllowCloudTrailEncrypt"
    effect    = "Allow"
    actions   = ["kms:GenerateDataKey*", "kms:DescribeKey"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["cloudtrail.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "kms:EncryptionContext:aws:cloudtrail:arn"
      values   = ["arn:${local.partition}:cloudtrail:*:${local.account_id}:trail/*"]
    }
  }

  # Lets CloudWatch alarms and EventBridge rules publish to the encrypted SNS alert topic.
  statement {
    sid       = "AllowAlarmsToPublishToEncryptedTopic"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey*"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com", "events.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_kms_key" "main" {
  description             = "${var.name} SSM SecureString parameters, log groups and audit trail"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.kms.json
}

resource "aws_kms_alias" "main" {
  name          = "alias/${var.name}"
  target_key_id = aws_kms_key.main.key_id
}

# ---------------------------------------------------------------------------
# Secret placeholders (values are supplied out of band)
# ---------------------------------------------------------------------------
resource "aws_ssm_parameter" "secret" {
  for_each = toset(var.secret_names)

  name        = "${var.ssm_path}/${each.value}"
  description = "Placeholder. Set the real value with: aws ssm put-parameter --overwrite --type SecureString"
  type        = "SecureString"
  key_id      = aws_kms_key.main.arn
  value       = "PLACEHOLDER-set-out-of-band"

  # Terraform owns the parameter's existence, never its value, so applies don't wipe real secrets.
  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "config" {
  for_each = var.config_values

  name        = "${var.ssm_path}/${each.key}"
  description = "Non-secret environment configuration managed by Terraform."
  type        = "String"
  value       = each.value
}

# ---------------------------------------------------------------------------
# X-Origin-Verify: shared secret between CloudFront and Caddy
# ---------------------------------------------------------------------------
resource "random_password" "origin_verify" {
  length  = 48
  special = false

  keepers = {
    rotation = var.origin_verify_rotation
  }
}

# Caddy reads this at start and rejects any request whose X-Origin-Verify header differs.
# The value must live in Terraform state because CloudFront needs it in its origin config, so
# the state bucket is private, encrypted and versioned (see bootstrap/).
resource "aws_ssm_parameter" "origin_verify" {
  name        = "${var.ssm_path}/ORIGIN_VERIFY_SECRET"
  description = "Value CloudFront sends as X-Origin-Verify. Rotate by changing origin_verify_rotation."
  type        = "SecureString"
  key_id      = aws_kms_key.main.arn
  value       = random_password.origin_verify.result
}
