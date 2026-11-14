variable "name" {
  description = "Resource name prefix, for example supporters-production."
  type        = string
}

variable "ssm_path" {
  description = "Parameter Store path prefix for this environment, for example /supporters/production. The instance role may read only this path."
  type        = string
}

variable "secret_names" {
  description = "Names (below ssm_path) of SecureString placeholders. Terraform creates them with a dummy value; real values are set out of band and never overwritten."
  type        = list(string)
}

variable "config_values" {
  description = "Non-secret configuration published as plain String parameters (bucket name, public URLs and so on), so the server renders its environment from one place."
  type        = map(string)
  default     = {}
}

variable "origin_verify_rotation" {
  description = "Change this string (for example 2027-Q1) to rotate the X-Origin-Verify secret. The spec rotates it quarterly."
  type        = string
  default     = "initial"
}
