# CloudFront only accepts ACM certificates issued in us-east-1, whatever region the rest lives in.
# One certificate covers both public hostnames and is validated through DNS in the client's zone.
# (The origin hostname's certificate is issued by Caddy on the server, not by ACM.)
resource "aws_acm_certificate" "this" {
  provider = aws.us_east_1

  domain_name               = var.app_domain
  subject_alternative_names = [var.media_domain]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "certificate_validation" {
  for_each = {
    for option in aws_acm_certificate.this.domain_validation_options : option.domain_name => {
      name   = option.resource_record_name
      record = option.resource_record_value
      type   = option.resource_record_type
    }
  }

  zone_id         = var.zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 60
  records         = [each.value.record]
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "this" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.this.arn
  validation_record_fqdns = [for record in aws_route53_record.certificate_validation : record.fqdn]
}
