data "aws_region" "current" {}

locals {
  mail_from_domain = "mail.${var.domain}"
  dmarc_tags       = var.dmarc_report_email == "" ? "" : "; rua=mailto:${var.dmarc_report_email}"
  dmarc_record     = "v=DMARC1; p=${var.dmarc_policy}${local.dmarc_tags}"
}

# The sending domain, verified through DKIM. Production access (leaving the SES sandbox) is a
# manual request in the SES console; see the client prerequisites in infra/README.md.
resource "aws_sesv2_email_identity" "this" {
  email_identity = var.domain

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }
}

resource "aws_route53_record" "dkim" {
  count = 3

  zone_id = var.zone_id
  name    = "${aws_sesv2_email_identity.this.dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain}"
  type    = "CNAME"
  ttl     = 600
  records = ["${aws_sesv2_email_identity.this.dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

# A custom MAIL FROM subdomain gives SPF its own record set, so this module never has to
# overwrite whatever TXT records already exist on the apex domain.
resource "aws_sesv2_email_identity_mail_from_attributes" "this" {
  email_identity         = aws_sesv2_email_identity.this.email_identity
  mail_from_domain       = local.mail_from_domain
  behavior_on_mx_failure = "USE_DEFAULT_VALUE"
}

resource "aws_route53_record" "mail_from_mx" {
  zone_id = var.zone_id
  name    = local.mail_from_domain
  type    = "MX"
  ttl     = 600
  records = ["10 feedback-smtp.${data.aws_region.current.region}.amazonses.com"]
}

resource "aws_route53_record" "mail_from_spf" {
  zone_id = var.zone_id
  name    = local.mail_from_domain
  type    = "TXT"
  ttl     = 600
  records = ["v=spf1 include:amazonses.com ~all"]
}

# Start with p=none (monitor), then tighten to quarantine or reject once reports look clean.
resource "aws_route53_record" "dmarc" {
  zone_id = var.zone_id
  name    = "_dmarc.${var.domain}"
  type    = "TXT"
  ttl     = 600
  records = [local.dmarc_record]
}
