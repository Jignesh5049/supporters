variable "name" {
  description = "Instance identifier and name prefix, for example supporters-production."
  type        = string
}

variable "subnet_ids" {
  description = "Private subnet ids (two AZs) for the DB subnet group."
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group that allows 5432 from the app server only."
  type        = string
}

variable "engine_major_version" {
  description = "PostgreSQL major version. RDS selects the current minor and upgrades it automatically."
  type        = string
  default     = "18"
}

variable "instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage_gb" {
  description = "Initial gp3 storage in GB."
  type        = number
  default     = 20
}

variable "max_allocated_storage_gb" {
  description = "Storage autoscaling ceiling in GB. Caps cost if the disk fills unexpectedly."
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Multi-AZ standby. Off at launch (single-AZ); turn on in the growth tier."
  type        = bool
  default     = false
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "supporters"
}

variable "master_username" {
  description = "Master user. Its password is generated and stored in Secrets Manager by RDS."
  type        = string
  default     = "supporters_admin"
}

variable "backup_retention_days" {
  description = "Automated backup and point-in-time-recovery window in days."
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "Block deletion of the instance until this is turned off."
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip the final snapshot on deletion. Keep false for anything that holds real data."
  type        = bool
  default     = false
}

variable "ca_cert_identifier" {
  description = "RDS server certificate authority. Clients that use sslmode=verify-full must trust its bundle."
  type        = string
  default     = "rds-ca-rsa2048-g1"
}
