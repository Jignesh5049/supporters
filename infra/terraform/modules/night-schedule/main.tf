# Stops the server and database overnight and starts them again in the morning, so staging only
# bills for compute during working hours. Storage, the Elastic IP and snapshots keep billing.
# RDS restarts by itself after seven days stopped; the nightly stop simply stops it again.
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["scheduler.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "run" {
  statement {
    sid       = "StartStopServer"
    actions   = ["ec2:StartInstances", "ec2:StopInstances"]
    resources = [var.instance_arn]
  }

  statement {
    sid       = "StartStopDatabase"
    actions   = ["rds:StartDBInstance", "rds:StopDBInstance"]
    resources = [var.db_arn]
  }
}

resource "aws_iam_role" "scheduler" {
  name               = "${var.name}-night-schedule"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy" "scheduler" {
  name   = "start-stop"
  role   = aws_iam_role.scheduler.id
  policy = data.aws_iam_policy_document.run.json
}

locals {
  schedules = {
    stop-database = {
      expression = "cron(0 ${var.stop_hour} * * ? *)"
      arn        = "arn:aws:scheduler:::aws-sdk:rds:stopDBInstance"
      input      = { DbInstanceIdentifier = var.db_identifier }
    }
    stop-server = {
      expression = "cron(0 ${var.stop_hour} * * ? *)"
      arn        = "arn:aws:scheduler:::aws-sdk:ec2:stopInstances"
      input      = { InstanceIds = [var.instance_id] }
    }
    # The database starts an hour earlier so it is ready when the server comes up.
    start-database = {
      expression = "cron(0 ${var.start_hour - 1} * * ? *)"
      arn        = "arn:aws:scheduler:::aws-sdk:rds:startDBInstance"
      input      = { DbInstanceIdentifier = var.db_identifier }
    }
    start-server = {
      expression = "cron(0 ${var.start_hour} * * ? *)"
      arn        = "arn:aws:scheduler:::aws-sdk:ec2:startInstances"
      input      = { InstanceIds = [var.instance_id] }
    }
  }
}

resource "aws_scheduler_schedule" "this" {
  for_each = local.schedules

  name                         = "${var.name}-${each.key}"
  schedule_expression          = each.value.expression
  schedule_expression_timezone = var.timezone
  state                        = var.enabled ? "ENABLED" : "DISABLED"

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = each.value.arn
    role_arn = aws_iam_role.scheduler.arn
    input    = jsonencode(each.value.input)
  }
}
