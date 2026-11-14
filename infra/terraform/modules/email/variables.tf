variable "domain" {
  description = "Sending domain, the same <domain> the product uses."
  type        = string
}

variable "zone_id" {
  description = "Route 53 hosted zone id that holds the domain's DNS."
  type        = string
}

variable "dmarc_policy" {
  description = "DMARC policy: none (monitor), quarantine or reject."
  type        = string
  default     = "none"

  validation {
    condition     = contains(["none", "quarantine", "reject"], var.dmarc_policy)
    error_message = "Use none, quarantine or reject."
  }
}

variable "dmarc_report_email" {
  description = "Mailbox that receives DMARC aggregate reports. Empty omits the rua tag."
  type        = string
  default     = ""
}
