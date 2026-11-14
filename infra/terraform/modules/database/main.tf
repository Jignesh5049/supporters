locals {
  parameter_group_family = "postgres${var.engine_major_version}"
}

resource "aws_db_subnet_group" "this" {
  name        = var.name
  description = "Private subnets for ${var.name}"
  subnet_ids  = var.subnet_ids
}

# TLS is mandatory: with rds.force_ssl the server rejects any non-TLS connection. The API
# connects with sslmode=verify-full and the RDS CA bundle (see infra/README.md).
resource "aws_db_parameter_group" "this" {
  name        = "${var.name}-pg${var.engine_major_version}"
  family      = local.parameter_group_family
  description = "${var.name}: require TLS, log slow queries"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "this" {
  identifier = var.name

  engine         = "postgres"
  engine_version = var.engine_major_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = var.max_allocated_storage_gb
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.master_username
  port     = 5432

  # RDS creates and owns the master password in Secrets Manager. It never passes through
  # Terraform, so it is not in state or outputs. Create a separate least-privilege app role
  # (see infra/README.md) and put its connection string in SSM.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false
  multi_az               = var.multi_az
  parameter_group_name   = aws_db_parameter_group.this.name
  ca_cert_identifier     = var.ca_cert_identifier

  iam_database_authentication_enabled = true

  # Point-in-time recovery needs automated backups; 7 days meets the spec's RPO of 5 minutes.
  backup_retention_period  = var.backup_retention_days
  backup_window            = "21:00-22:00" # 02:30-03:30 IST
  maintenance_window       = "sun:22:00-sun:23:00"
  copy_tags_to_snapshot    = true
  delete_automated_backups = false

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.name}-final"

  auto_minor_version_upgrade      = true
  apply_immediately               = false
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  lifecycle {
    # AWS picks the minor version of "18" and upgrades it, so ignore drift on engine_version.
    ignore_changes = [engine_version]
  }
}
