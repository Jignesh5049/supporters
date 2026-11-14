variable "prefix" {
  description = "Namespace of the repositories: <prefix>/<name>."
  type        = string
  default     = "supporters"
}

variable "repositories" {
  description = "Image names, one repository each. The worker runs the API image."
  type        = list(string)
  default     = ["api", "web", "caddy"]
}

variable "kms_key_arn" {
  description = "Customer-managed key that encrypts the repositories."
  type        = string
}

variable "image_tag_mutability" {
  description = "IMMUTABLE stops a tag from being re-pointed, so a deployed tag always means the same image. The pipeline must push unique tags (for example the git SHA)."
  type        = string
  default     = "IMMUTABLE"

  validation {
    condition     = contains(["IMMUTABLE", "MUTABLE"], var.image_tag_mutability)
    error_message = "Use IMMUTABLE or MUTABLE."
  }
}

variable "keep_images" {
  description = "Number of images kept per repository."
  type        = number
  default     = 30
}

variable "enable_enhanced_scanning" {
  description = "Turn on registry-wide enhanced scanning with Amazon Inspector (spec: ECR enhanced scanning)."
  type        = bool
  default     = true
}
