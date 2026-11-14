data "aws_caller_identity" "current" {}

# ---------------------------------------------------------------------------
# Log groups (30-day retention, encrypted). The containers write here through Docker's awslogs
# driver using the instance role; the group names match the instance policy's log prefix.
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "app" {
  for_each = toset(var.log_group_names)

  name              = "${var.log_group_prefix}/${each.value}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.kms_key_arn
}

# ---------------------------------------------------------------------------
# Notifications. Email subscriptions must be confirmed once from each recipient's inbox.
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "alerts" {
  statement {
    sid       = "AllowCloudWatchAndEventBridge"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alerts.arn]

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com", "events.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic" "alerts" {
  name              = "${var.name}-alerts"
  kms_master_key_id = var.kms_key_arn
}

resource "aws_sns_topic_policy" "alerts" {
  arn    = aws_sns_topic.alerts.arn
  policy = data.aws_iam_policy_document.alerts.json
}

resource "aws_sns_topic_subscription" "email" {
  for_each = toset(var.alert_emails)

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# SNS encryption keys are regional, so the edge topic needs its own key. CloudWatch is allowed to
# use it to publish alarms.
data "aws_iam_policy_document" "sns_us_east_1_key" {
  statement {
    sid       = "EnableIamPolicies"
    actions   = ["kms:*"]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
  }

  statement {
    sid       = "AllowCloudWatchToPublish"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey*"]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_kms_key" "sns_us_east_1" {
  provider = aws.us_east_1

  description             = "${var.name} edge alarm topic"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  policy                  = data.aws_iam_policy_document.sns_us_east_1_key.json
}

# CloudFront publishes its metrics in us-east-1 only, and an alarm can notify only a topic in its
# own region, so the edge alarm needs a second topic.
resource "aws_sns_topic" "alerts_us_east_1" {
  provider = aws.us_east_1

  name              = "${var.name}-alerts-edge"
  kms_master_key_id = aws_kms_key.sns_us_east_1.arn
}

data "aws_iam_policy_document" "alerts_us_east_1" {
  statement {
    sid       = "AllowCloudWatch"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.alerts_us_east_1.arn]

    principals {
      type        = "Service"
      identifiers = ["cloudwatch.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_sns_topic_policy" "alerts_us_east_1" {
  provider = aws.us_east_1

  arn    = aws_sns_topic.alerts_us_east_1.arn
  policy = data.aws_iam_policy_document.alerts_us_east_1.json
}

resource "aws_sns_topic_subscription" "email_us_east_1" {
  provider = aws.us_east_1
  for_each = toset(var.alert_emails)

  topic_arn = aws_sns_topic.alerts_us_east_1.arn
  protocol  = "email"
  endpoint  = each.value
}

# ---------------------------------------------------------------------------
# Alarms: CPU, disk, memory and status of the server; database health; edge 5xx rate.
# ---------------------------------------------------------------------------
resource "aws_cloudwatch_metric_alarm" "server_cpu" {
  alarm_name          = "${var.name}-server-cpu-high"
  alarm_description   = "Server CPU above ${var.cpu_threshold_percent}% for 15 minutes. The spec's trigger for moving to the growth tier is sustained CPU above 60%."
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  dimensions          = { InstanceId = var.instance_id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = var.cpu_threshold_percent
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "server_status" {
  alarm_name          = "${var.name}-server-status-check-failed"
  alarm_description   = "The server failed its EC2 status checks."
  namespace           = "AWS/EC2"
  metric_name         = "StatusCheckFailed"
  dimensions          = { InstanceId = var.instance_id }
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 3
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

# Disk and memory come from the CloudWatch agent configured in the compute module's user data.
# Missing data counts as breaching, so a dead agent is noticed too.
resource "aws_cloudwatch_metric_alarm" "server_disk" {
  alarm_name          = "${var.name}-server-disk-high"
  alarm_description   = "Root volume above ${var.disk_threshold_percent}% full (Docker images, Valkey and Meilisearch data)."
  namespace           = "CWAgent"
  metric_name         = "disk_used_percent"
  dimensions          = { InstanceId = var.instance_id, path = "/" }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 2
  threshold           = var.disk_threshold_percent
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = var.server_may_be_stopped ? "notBreaching" : "breaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "server_memory" {
  alarm_name          = "${var.name}-server-memory-high"
  alarm_description   = "Server memory above ${var.memory_threshold_percent}%. Meilisearch and Valkey share this host with the API and web app."
  namespace           = "CWAgent"
  metric_name         = "mem_used_percent"
  dimensions          = { InstanceId = var.instance_id }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 3
  threshold           = var.memory_threshold_percent
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = var.server_may_be_stopped ? "notBreaching" : "breaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "db_cpu" {
  alarm_name          = "${var.name}-db-cpu-high"
  alarm_description   = "Database CPU above ${var.cpu_threshold_percent}% for 15 minutes."
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = var.cpu_threshold_percent
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "db_connections" {
  alarm_name          = "${var.name}-db-connections-high"
  alarm_description   = "Open database connections above ${var.db_connections_threshold}. A db.t4g.micro allows roughly 110."
  namespace           = "AWS/RDS"
  metric_name         = "DatabaseConnections"
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 2
  threshold           = var.db_connections_threshold
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "db_storage" {
  alarm_name          = "${var.name}-db-free-storage-low"
  alarm_description   = "Less than ${var.db_free_storage_threshold_gb} GB of database storage left."
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 2
  threshold           = var.db_free_storage_threshold_gb * 1073741824
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

# Burstable instances slow down sharply when their CPU credits run out.
resource "aws_cloudwatch_metric_alarm" "db_cpu_credits" {
  alarm_name          = "${var.name}-db-cpu-credits-low"
  alarm_description   = "The burstable database is running out of CPU credits; resize the instance."
  namespace           = "AWS/RDS"
  metric_name         = "CPUCreditBalance"
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 3
  threshold           = 20
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "edge_5xx" {
  provider = aws.us_east_1

  alarm_name          = "${var.name}-edge-5xx-rate-high"
  alarm_description   = "More than ${var.edge_5xx_threshold_percent}% of requests through CloudFront ended in a 5xx error."
  namespace           = "AWS/CloudFront"
  metric_name         = "5xxErrorRate"
  dimensions          = { DistributionId = var.cloudfront_distribution_id, Region = "Global" }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = var.edge_5xx_threshold_percent
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts_us_east_1.arn]
  ok_actions          = [aws_sns_topic.alerts_us_east_1.arn]
}
