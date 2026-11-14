locals {
  origin_id       = "app-server"
  media_origin_id = "media-bucket"
  signed_chat     = var.chat_signing_public_key_pem != ""
}

# AWS-managed policies, looked up by name so no ids are hard-coded.
data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

# Forwards every cookie, header and query string except Host. Host is left out on purpose: the
# origin certificate is issued for origin.<domain>, and CloudFront validates it against the host
# it connects to. The API and web app use APP_ORIGIN, not the Host header.
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# ---------------------------------------------------------------------------
# /_next/static/* is content-hashed, so it can be cached for a year and never revalidated.
# ---------------------------------------------------------------------------
resource "aws_cloudfront_cache_policy" "immutable_static" {
  name        = "${var.name}-immutable-static"
  comment     = "Next.js static assets: cache for one year"
  min_ttl     = 31536000
  default_ttl = 31536000
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true

    cookies_config {
      cookie_behavior = "none"
    }

    headers_config {
      header_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# ---------------------------------------------------------------------------
# App distribution: <domain> -> Caddy on the server
# ---------------------------------------------------------------------------
resource "aws_cloudfront_distribution" "app" {
  comment         = "${var.name} app (web and /v1 API)"
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = var.price_class
  aliases         = [var.app_domain]
  web_acl_id      = aws_wafv2_web_acl.this.arn

  # One origin: Caddy routes /v1 to the API container and everything else to Next.js.
  origin {
    origin_id   = local.origin_id
    domain_name = var.origin_domain

    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 60
      origin_keepalive_timeout = 60
    }

    custom_header {
      name  = "X-Origin-Verify"
      value = var.origin_verify_value
    }
  }

  # Socket.IO chat (WebSocket upgrades and long-polling fallback): never cached.
  ordered_cache_behavior {
    path_pattern             = "/v1/ws*"
    target_origin_id         = local.origin_id
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    compress                 = false
  }

  # REST API: never cached, every header, cookie and query string reaches the API.
  ordered_cache_behavior {
    path_pattern             = "/v1/*"
    target_origin_id         = local.origin_id
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    compress                 = true
  }

  ordered_cache_behavior {
    path_pattern           = "/_next/static/*"
    target_origin_id       = local.origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = aws_cloudfront_cache_policy.immutable_static.id
    compress               = true
  }

  # Everything else is server-rendered by Next.js (per-request CSP nonce), so nothing is cached.
  default_cache_behavior {
    target_origin_id         = local.origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    compress                 = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.this.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# ---------------------------------------------------------------------------
# Media distribution: media.<domain> -> private S3 bucket through Origin Access Control
# ---------------------------------------------------------------------------
resource "aws_cloudfront_origin_access_control" "media" {
  name                              = "${var.name}-media"
  description                       = "CloudFront signs its requests to the media bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "media" {
  name    = "${var.name}-media-security"
  comment = "Uploaded files must never be sniffed into scripts or rendered as pages"

  security_headers_config {
    content_type_options {
      override = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      override                   = true
    }

    referrer_policy {
      referrer_policy = "no-referrer"
      override        = true
    }

    content_security_policy {
      content_security_policy = "default-src 'none'; sandbox"
      override                = true
    }
  }
}

resource "aws_cloudfront_public_key" "chat" {
  count = local.signed_chat ? 1 : 0

  name        = "${var.name}-chat-signing"
  comment     = "Verifies signed chat attachment URLs"
  encoded_key = var.chat_signing_public_key_pem
}

resource "aws_cloudfront_key_group" "chat" {
  count = local.signed_chat ? 1 : 0

  name    = "${var.name}-chat-signing"
  comment = "Keys allowed to sign chat attachment URLs"
  items   = [aws_cloudfront_public_key.chat[0].id]
}

resource "aws_cloudfront_distribution" "media" {
  comment         = "${var.name} media (private bucket via OAC)"
  enabled         = true
  is_ipv6_enabled = true
  http_version    = "http2and3"
  price_class     = var.price_class
  aliases         = [var.media_domain]

  origin {
    origin_id                = local.media_origin_id
    domain_name              = var.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.media.id
  }

  # Chat attachments: only with a valid CloudFront signed URL (about 5 minutes long).
  dynamic "ordered_cache_behavior" {
    for_each = local.signed_chat ? [1] : []

    content {
      path_pattern               = "chat/*"
      target_origin_id           = local.media_origin_id
      viewer_protocol_policy     = "https-only"
      allowed_methods            = ["GET", "HEAD"]
      cached_methods             = ["GET", "HEAD"]
      cache_policy_id            = data.aws_cloudfront_cache_policy.disabled.id
      response_headers_policy_id = aws_cloudfront_response_headers_policy.media.id
      trusted_key_groups         = [aws_cloudfront_key_group.chat[0].id]
      compress                   = false
    }
  }

  # Everything else is public media. The bucket policy grants this distribution read access to
  # public/* only, so a request for kyc/... (or anything else) is refused by S3.
  default_cache_behavior {
    target_origin_id           = local.media_origin_id
    viewer_protocol_policy     = "https-only"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.media.id
    compress                   = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.this.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# ---------------------------------------------------------------------------
# Bucket policy: only the media distribution may read, and only public/ (and signed chat/)
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "bucket" {
  source_policy_documents = [var.bucket_base_policy_json]

  statement {
    sid       = "CloudFrontReadPublicMedia"
    actions   = ["s3:GetObject"]
    resources = ["${var.bucket_arn}/public/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.media.arn]
    }
  }

  dynamic "statement" {
    for_each = local.signed_chat ? [1] : []

    content {
      sid       = "CloudFrontReadSignedChatMedia"
      actions   = ["s3:GetObject"]
      resources = ["${var.bucket_arn}/chat/*"]

      principals {
        type        = "Service"
        identifiers = ["cloudfront.amazonaws.com"]
      }

      condition {
        test     = "StringEquals"
        variable = "AWS:SourceArn"
        values   = [aws_cloudfront_distribution.media.arn]
      }
    }
  }
}

resource "aws_s3_bucket_policy" "media" {
  bucket = var.bucket_id
  policy = data.aws_iam_policy_document.bucket.json
}

# ---------------------------------------------------------------------------
# DNS
# ---------------------------------------------------------------------------
resource "aws_route53_record" "app" {
  for_each = toset(["A", "AAAA"])

  zone_id = var.zone_id
  name    = var.app_domain
  type    = each.value

  alias {
    name                   = aws_cloudfront_distribution.app.domain_name
    zone_id                = aws_cloudfront_distribution.app.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "media" {
  for_each = toset(["A", "AAAA"])

  zone_id = var.zone_id
  name    = var.media_domain
  type    = each.value

  alias {
    name                   = aws_cloudfront_distribution.media.domain_name
    zone_id                = aws_cloudfront_distribution.media.hosted_zone_id
    evaluate_target_health = false
  }
}

# The origin name is public DNS, but a request only gets through with the X-Origin-Verify header
# and from CloudFront's address ranges.
resource "aws_route53_record" "origin" {
  zone_id = var.zone_id
  name    = var.origin_domain
  type    = "A"
  ttl     = 60
  records = [var.origin_ip]
}
