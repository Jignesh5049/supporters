variable "name" {
  description = "Resource name prefix, for example supporters-production."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository allowed to assume the role, <org>/<repo>."
  type        = string
}

variable "github_subjects" {
  description = "Allowed OIDC subject suffixes, for example [\"environment:production\"]. Prefer GitHub Environments, which can require approval, over branch subjects."
  type        = list(string)
}

variable "ecr_repository_arns" {
  description = "ECR repository ARN patterns the pipeline may push to."
  type        = list(string)
}

variable "instance_arn" {
  description = "ARN of the app server the pipeline may run commands on."
  type        = string
}
