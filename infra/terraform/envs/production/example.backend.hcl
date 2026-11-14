# Copy to backend.hcl (git-ignored) with the values printed by the bootstrap stack:
#   terraform init -backend-config=backend.hcl
bucket         = "supporters-tfstate-<account-id>"
key            = "production/terraform.tfstate"
region         = "ap-south-1"
dynamodb_table = "supporters-tfstate-lock"
encrypt        = true
