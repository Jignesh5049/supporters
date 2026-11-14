variable "bucket_name" {
  description = "Globally unique bucket name, for example supporters-production-media-<account-id>."
  type        = string
}

variable "cors_allowed_origins" {
  description = "Origins allowed to PUT to presigned URLs, for example [\"https://<domain>\"]."
  type        = list(string)
}

variable "noncurrent_version_days" {
  description = "Days to keep non-current object versions (the safety net against accidental deletes)."
  type        = number
  default     = 30
}

variable "public_tiering_after_days" {
  description = "Days before objects under public/ move to Intelligent-Tiering."
  type        = number
  default     = 30
}
