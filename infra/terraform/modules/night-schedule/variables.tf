variable "name" {
  description = "Resource name prefix, for example supporters-staging."
  type        = string
}

variable "instance_id" {
  description = "Server instance id."
  type        = string
}

variable "instance_arn" {
  description = "Server instance ARN."
  type        = string
}

variable "db_identifier" {
  description = "RDS instance identifier."
  type        = string
}

variable "db_arn" {
  description = "RDS instance ARN."
  type        = string
}

variable "timezone" {
  description = "IANA time zone of the schedule."
  type        = string
  default     = "Asia/Kolkata"
}

variable "stop_hour" {
  description = "Hour (0-23, in the schedule's time zone) when staging stops."
  type        = number
  default     = 22
}

variable "start_hour" {
  description = "Hour (1-23, in the schedule's time zone) when staging starts. The database starts one hour earlier."
  type        = number
  default     = 8
}

variable "enabled" {
  description = "Set false to keep staging running (for example during a release test) without removing the schedule."
  type        = bool
  default     = true
}
