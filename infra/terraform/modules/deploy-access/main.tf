data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region

  # The provider itself is created once per account by the bootstrap stack.
  oidc_provider_arn = "arn:aws:iam::${local.account_id}:oidc-provider/token.actions.githubusercontent.com"
  subjects          = [for s in var.github_subjects : "repo:${var.github_repository}:${s}"]
}

# GitHub Actions assumes this role with a short-lived OIDC token, so no AWS access keys are
# stored in GitHub. The token's `sub` claim must match one of the subjects (a GitHub
# Environment, so production deploys can require manual approval).
data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = local.subjects
    }
  }
}

resource "aws_iam_role" "deploy" {
  name                 = "${var.name}-github-deploy"
  description          = "Assumed by GitHub Actions (OIDC) to push images and roll out on the ${var.name} server"
  assume_role_policy   = data.aws_iam_policy_document.assume.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "EcrLogin"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid = "EcrPushAndInspect"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:DescribeImages",
      "ecr:DescribeImageScanFindings",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = var.ecr_repository_arns
  }

  # Enhanced scanning reports findings through Inspector; the pipeline blocks a deploy on a
  # critical finding.
  statement {
    sid       = "ReadScanFindings"
    actions   = ["inspector2:ListFindings"]
    resources = ["*"]
  }

  # Roll out by running a shell command on this environment's server only.
  statement {
    sid       = "RunCommandOnServer"
    actions   = ["ssm:SendCommand"]
    resources = [var.instance_arn, "arn:aws:ssm:${local.region}::document/AWS-RunShellScript"]
  }

  statement {
    sid = "ReadCommandResults"
    actions = [
      "ssm:GetCommandInvocation",
      "ssm:ListCommandInvocations",
      "ssm:ListCommands",
      "ssm:DescribeInstanceInformation",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
