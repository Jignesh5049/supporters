terraform {
  required_version = "~> 1.17"

  # Partial configuration: bucket, key, region and table come from backend.hcl
  # (copy example.backend.hcl). CI runs `terraform init -backend=false`.
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.73.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.9.1"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = "supporters"
      Environment = local.environment
      ManagedBy   = "terraform"
    }
  }
}
