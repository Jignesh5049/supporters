# Caddy with the Route 53 DNS plugin. The origin certificate is issued with the ACME DNS-01
# challenge, because the security group only lets CloudFront reach port 443 (no HTTP-01 or
# TLS-ALPN-01 from Let's Encrypt). The plugin uses the instance role, so no key is stored.
#   docker build -f deploy/caddy/Dockerfile -t supporters-caddy deploy/caddy
ARG CADDY_VERSION=2.11.9
FROM caddy:${CADDY_VERSION}-builder-alpine@sha256:646fee578e680989ca5c7fd1ce6f1de574d19fd71ef2221810cc0510a9f40c86 AS builder
# The builder image sets CADDY_VERSION=v2.11.9 itself, which xcaddy reads.
RUN xcaddy build --with github.com/caddy-dns/route53@v1.6.3

FROM caddy:${CADDY_VERSION}-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
COPY tls /etc/caddy/tls
