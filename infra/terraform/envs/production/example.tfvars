# Copy to terraform.tfvars (git-ignored) and replace the placeholders. No real values in git.

region = "ap-south-1"

# The public Route 53 hosted zone the client owns, for example "example.com".
domain = "<domain>"

# Launch tier. Move to the growth tier only when load needs it (product spec, Hosting on AWS).
instance_type     = "t4g.large"
db_instance_class = "db.t4g.micro"

# Change to rotate the X-Origin-Verify secret (the spec rotates it quarterly).
origin_verify_rotation = "initial"
