terraform {
  required_version = "~> 1.17"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "6.73.0"
    }
  }
}

# The bootstrap stack keeps its state locally on purpose: it creates the remote-state bucket,
# so it cannot use it yet. It is applied once per AWS account and rarely changes. After the
# first apply, back up terraform.tfstate somewhere safe, or migrate it into the bucket it
# created (see infra/README.md).
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "supporters"
      ManagedBy = "terraform"
      Stack     = "bootstrap"
    }
  }
}
