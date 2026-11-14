variable "name" {
  description = "Resource name prefix, for example supporters-production."
  type        = string
}

variable "log_group_prefix" {
  description = "Prefix of the application log groups, for example /supporters/production."
  type        = string
}

variable "log_group_names" {
  description = "Log groups to create below the prefix, one per container."
  type        = list(string)
  default     = ["api", "web", "worker", "caddy", "meilisearch", "valkey"]
}

variable "log_retention_days" {
  description = "Retention of the application log groups (spec: 30 days)."
  type        = number
  default     = 30
}

variable "kms_key_arn" {
  description = "Customer-managed key that encrypts the log groups."
  type        = string
}

variable "alert_emails" {
  description = "Addresses that receive alarm emails. Each must confirm the subscription once."
  type        = list(string)
}

variable "instance_id" {
  description = "App server instance id."
  type        = string
}

variable "db_identifier" {
  description = "RDS instance identifier."
  type        = string
}

variable "cloudfront_distribution_id" {
  description = "App distribution id for the 5xx alarm."
  type        = string
}

variable "cpu_threshold_percent" {
  description = "CPU alarm threshold for the server and the database."
  type        = number
  default     = 80
}

variable "disk_threshold_percent" {
  description = "Root volume usage alarm threshold."
  type        = number
  default     = 80
}

variable "memory_threshold_percent" {
  description = "Server memory alarm threshold."
  type        = number
  default     = 85
}

variable "db_connections_threshold" {
  description = "Database connection count alarm threshold."
  type        = number
  default     = 80
}

variable "db_free_storage_threshold_gb" {
  description = "Alarm when the database has less free storage than this many GB."
  type        = number
  default     = 4
}

variable "edge_5xx_threshold_percent" {
  description = "Alarm when this percentage of CloudFront responses are 5xx."
  type        = number
  default     = 5
}

variable "server_may_be_stopped" {
  description = "True when the server is stopped on a schedule (staging). Missing disk and memory metrics then do not trigger alarms; otherwise a silent agent counts as a breach."
  type        = bool
  default     = false
}
