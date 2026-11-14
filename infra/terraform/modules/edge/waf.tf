# AWS WAF for CloudFront must live in us-east-1 (scope CLOUDFRONT).
locals {
  waf_metric_prefix = replace(var.name, "-", "")
}

resource "aws_wafv2_ip_set" "admin_ipv4" {
  provider = aws.us_east_1

  name               = "${var.name}-admin-ipv4"
  description        = "IPv4 addresses allowed to reach the admin area"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = var.admin_allowed_ipv4_cidrs
}

resource "aws_wafv2_ip_set" "admin_ipv6" {
  provider = aws.us_east_1

  name               = "${var.name}-admin-ipv6"
  description        = "IPv6 addresses allowed to reach the admin area"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV6"
  addresses          = var.admin_allowed_ipv6_cidrs
}

resource "aws_wafv2_web_acl" "this" {
  provider = aws.us_east_1

  name        = var.name
  description = "Edge protection for ${var.app_domain}"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # 0. Admin area (web /admin* and API /v1/admin/*) is reachable only from the allow-listed IPs.
  # Paths are URL-decoded, normalised and lower-cased first so encoded variants cannot slip by.
  rule {
    name     = "admin-ip-allow-list"
    priority = 0

    action {
      block {}
    }

    statement {
      and_statement {
        statement {
          or_statement {
            statement {
              byte_match_statement {
                search_string         = "/admin"
                positional_constraint = "STARTS_WITH"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "URL_DECODE"
                }

                text_transformation {
                  priority = 1
                  type     = "NORMALIZE_PATH"
                }

                text_transformation {
                  priority = 2
                  type     = "LOWERCASE"
                }
              }
            }

            statement {
              byte_match_statement {
                search_string         = "/v1/admin"
                positional_constraint = "STARTS_WITH"

                field_to_match {
                  uri_path {}
                }

                text_transformation {
                  priority = 0
                  type     = "URL_DECODE"
                }

                text_transformation {
                  priority = 1
                  type     = "NORMALIZE_PATH"
                }

                text_transformation {
                  priority = 2
                  type     = "LOWERCASE"
                }
              }
            }
          }
        }

        statement {
          not_statement {
            statement {
              or_statement {
                statement {
                  ip_set_reference_statement {
                    arn = aws_wafv2_ip_set.admin_ipv4.arn
                  }
                }

                statement {
                  ip_set_reference_statement {
                    arn = aws_wafv2_ip_set.admin_ipv6.arn
                  }
                }
              }
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.waf_metric_prefix}AdminIpAllowList"
      sampled_requests_enabled   = true
    }
  }

  # 1. Credential-stuffing and OTP-spam guard on the auth routes, per client IP.
  rule {
    name     = "rate-limit-auth"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit                 = var.auth_rate_limit
        evaluation_window_sec = 300
        aggregate_key_type    = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/v1/auth/"
            positional_constraint = "STARTS_WITH"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.waf_metric_prefix}RateLimitAuth"
      sampled_requests_enabled   = true
    }
  }

  # 2. Coarse flood guard for any other path.
  rule {
    name     = "rate-limit-global"
    priority = 2

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit                 = var.global_rate_limit
        evaluation_window_sec = 300
        aggregate_key_type    = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.waf_metric_prefix}RateLimitGlobal"
      sampled_requests_enabled   = true
    }
  }

  # 3. AWS managed core rule set (OWASP-style: XSS, SSRF patterns, bad user agents, ...).
  rule {
    name     = "aws-managed-core"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"

        # This rule blocks any body over 8 KB. The API enforces its own 1 MB body limit and
        # uploads go straight to S3, so count it instead of rejecting legitimate JSON.
        rule_action_override {
          name = "SizeRestrictions_BODY"

          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.waf_metric_prefix}CoreRuleSet"
      sampled_requests_enabled   = true
    }
  }

  # 4. Known-bad inputs (Log4Shell-style payloads, host header abuse, ...).
  rule {
    name     = "aws-managed-known-bad-inputs"
    priority = 4

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.waf_metric_prefix}KnownBadInputs"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.waf_metric_prefix}WebAcl"
    sampled_requests_enabled   = true
  }
}

# ---------------------------------------------------------------------------
# WAF logs (credentials and cookies redacted)
# ---------------------------------------------------------------------------
data "aws_caller_identity" "current" {}

resource "aws_cloudwatch_log_group" "waf" {
  provider = aws.us_east_1

  # AWS requires this prefix for WAF log destinations.
  name              = "aws-waf-logs-${var.name}"
  retention_in_days = var.waf_log_retention_days
}

data "aws_iam_policy_document" "waf_logs" {
  statement {
    sid       = "AllowWafLogDelivery"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.waf.arn}:*"]

    principals {
      type        = "Service"
      identifiers = ["delivery.logs.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }
  }
}

resource "aws_cloudwatch_log_resource_policy" "waf" {
  provider = aws.us_east_1

  policy_name     = "${var.name}-waf-logs"
  policy_document = data.aws_iam_policy_document.waf_logs.json
}

resource "aws_wafv2_web_acl_logging_configuration" "this" {
  provider = aws.us_east_1

  resource_arn            = aws_wafv2_web_acl.this.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }

  redacted_fields {
    single_header {
      name = "cookie"
    }
  }

  depends_on = [aws_cloudwatch_log_resource_policy.waf]
}
