data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Latest Amazon Linux 2023 arm64 image. The instance ignores later AMI releases (see the
# lifecycle block) so a new image never replaces a running server; patch with dnf instead.
data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

locals {
  region     = data.aws_region.current.region
  account_id = data.aws_caller_identity.current.account_id
  acme       = var.acme_route53_zone_arn != "" && length(var.acme_challenge_record_names) > 0
}

# ---------------------------------------------------------------------------
# Instance profile (least privilege)
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "this" {
  name               = "${var.name}-app"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

# Session Manager, Run Command (deploys) and patching. This is the only AWS-managed policy used.
resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.this.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

data "aws_iam_policy_document" "app" {
  # Media bucket: only the three documented prefixes.
  statement {
    sid       = "MediaBucketList"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [var.s3_bucket_arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["public/*", "chat/*", "kyc/*"]
    }
  }

  statement {
    sid = "MediaBucketObjects"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:AbortMultipartUpload",
      "s3:ListMultipartUploadParts",
    ]
    resources = [
      "${var.s3_bucket_arn}/public/*",
      "${var.s3_bucket_arn}/chat/*",
      "${var.s3_bucket_arn}/kyc/*",
    ]
  }

  statement {
    sid       = "SendEmail"
    actions   = ["ses:SendEmail", "ses:SendRawEmail", "ses:SendTemplatedEmail"]
    resources = var.ses_identity_arns
  }

  # Secrets: this environment's path only, decrypted through SSM with this environment's key.
  statement {
    sid     = "ReadOwnParameters"
    actions = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = [
      "arn:aws:ssm:${local.region}:${local.account_id}:parameter${var.ssm_path}",
      "arn:aws:ssm:${local.region}:${local.account_id}:parameter${var.ssm_path}/*",
    ]
  }

  statement {
    sid       = "DecryptOwnParameters"
    actions   = ["kms:Decrypt"]
    resources = [var.ssm_kms_key_arn]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${local.region}.amazonaws.com"]
    }
  }

  statement {
    sid       = "AgentMetrics"
    actions   = ["cloudwatch:PutMetricData"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "cloudwatch:namespace"
      values   = ["CWAgent"]
    }
  }

  statement {
    sid = "WriteOwnLogs"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogStreams",
    ]
    resources = [
      "arn:aws:logs:${local.region}:${local.account_id}:log-group:${var.log_group_prefix}/*",
      "arn:aws:logs:${local.region}:${local.account_id}:log-group:${var.log_group_prefix}/*:log-stream:*",
    ]
  }

  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPull"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = var.ecr_repository_arns
  }

  # Caddy proves ownership of the origin hostname with a DNS-01 challenge because port 80 is
  # closed to the internet. The permission is limited to the TXT challenge record names.
  dynamic "statement" {
    for_each = local.acme ? [1] : []

    content {
      sid       = "AcmeDnsChallenge"
      actions   = ["route53:ChangeResourceRecordSets", "route53:ListResourceRecordSets"]
      resources = [var.acme_route53_zone_arn]

      condition {
        test     = "ForAllValues:StringEquals"
        variable = "route53:ChangeResourceRecordSetsNormalizedRecordNames"
        values   = var.acme_challenge_record_names
      }

      condition {
        test     = "ForAllValues:StringEquals"
        variable = "route53:ChangeResourceRecordSetsRecordTypes"
        values   = ["TXT"]
      }
    }
  }

  dynamic "statement" {
    for_each = local.acme ? [1] : []

    content {
      sid       = "AcmeDnsLookup"
      actions   = ["route53:GetChange", "route53:ListHostedZonesByName"]
      resources = ["*"]
    }
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "app-least-privilege"
  role   = aws_iam_role.this.id
  policy = data.aws_iam_policy_document.app.json
}

resource "aws_iam_instance_profile" "this" {
  name = "${var.name}-app"
  role = aws_iam_role.this.name
}

# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------
resource "aws_instance" "this" {
  ami                    = data.aws_ssm_parameter.al2023_arm64.insecure_value
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [var.security_group_id]
  iam_instance_profile   = aws_iam_instance_profile.this.name

  # The public address is the Elastic IP below, not an auto-assigned one.
  associate_public_ip_address = false
  disable_api_termination     = var.termination_protection

  # IMDSv2 only. A hop limit of 2 lets containers on the Docker bridge reach the instance role
  # (the API uses it for S3 and SES), which a limit of 1 would block.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 2
    instance_metadata_tags      = "disabled"
  }

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.root_volume_gb
    encrypted             = true
    delete_on_termination = true

    tags = {
      Name   = "${var.name}-root"
      Backup = var.name
    }
  }

  user_data = templatefile("${path.module}/user-data.sh.tftpl", {
    region                 = local.region
    ecr_registry           = var.ecr_registry
    docker_compose_version = var.docker_compose_version
  })
  user_data_replace_on_change = false

  tags = { Name = var.name }

  lifecycle {
    ignore_changes = [ami]
  }
}

resource "aws_eip" "this" {
  domain = "vpc"

  tags = { Name = var.name }
}

resource "aws_eip_association" "this" {
  instance_id   = aws_instance.this.id
  allocation_id = aws_eip.this.id
}

# ---------------------------------------------------------------------------
# Daily EBS snapshots (Valkey queues and Meilisearch data live on the root volume)
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "dlm_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["dlm.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "dlm" {
  count = var.snapshot_retention_days > 0 ? 1 : 0

  name               = "${var.name}-dlm"
  assume_role_policy = data.aws_iam_policy_document.dlm_assume.json
}

resource "aws_iam_role_policy_attachment" "dlm" {
  count = var.snapshot_retention_days > 0 ? 1 : 0

  role       = aws_iam_role.dlm[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole"
}

resource "aws_dlm_lifecycle_policy" "snapshots" {
  count = var.snapshot_retention_days > 0 ? 1 : 0

  description        = "${var.name}: daily root volume snapshots"
  execution_role_arn = aws_iam_role.dlm[0].arn
  state              = "ENABLED"

  policy_details {
    resource_types = ["VOLUME"]
    target_tags    = { Backup = var.name }

    schedule {
      name = "daily"

      create_rule {
        interval      = 24
        interval_unit = "HOURS"
        times         = ["21:30"] # 03:00 IST
      }

      retain_rule {
        count = var.snapshot_retention_days
      }

      copy_tags = true
    }
  }
}
