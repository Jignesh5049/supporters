variable "name" {
  description = "Resource name prefix, for example supporters-production."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "azs" {
  description = "Two availability zones. RDS needs a subnet group that spans two, even for a single-AZ instance."
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]

  validation {
    condition     = length(var.azs) == 2
    error_message = "Provide exactly two availability zones."
  }
}

variable "public_subnet_cidrs" {
  description = "One CIDR per AZ for the public subnets (the app server lives here)."
  type        = list(string)
  default     = ["10.20.0.0/24", "10.20.1.0/24"]
}

variable "private_subnet_cidrs" {
  description = "One CIDR per AZ for the private subnets (RDS lives here, with no route to the internet)."
  type        = list(string)
  default     = ["10.20.10.0/24", "10.20.11.0/24"]
}

variable "flow_log_kms_key_arn" {
  description = "Customer-managed key that encrypts the VPC flow log group."
  type        = string
}

variable "flow_log_retention_days" {
  description = "Retention of the VPC flow log group."
  type        = number
  default     = 30
}
