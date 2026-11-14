# Security policy

Supporters handles business identity documents (GSTIN, KYC) and, soon, payments. We take reports seriously and want to hear about problems before anyone else does.

## Reporting a vulnerability

**Do not open a public issue or pull request for a security problem.**

Report it privately through **GitHub private vulnerability reporting**: on this repository, open the **Security** tab and choose **Report a vulnerability**. Only the maintainers can see the report.

A dedicated security mailbox and a `security.txt` will be added when the production domain is live; until then the GitHub channel is the only one, and a report sent anywhere else may not be seen.

Please include what you found, where (URL, endpoint, app version), the steps to reproduce it, and what an attacker could do with it. A proof of concept helps; please do not include real user data.

### What to expect

| Step | Target |
| --- | --- |
| We acknowledge your report | within 3 working days |
| We confirm the issue and its severity | within 7 working days |
| We fix critical and high issues | within 30 days; medium within 90 |
| We tell you when it is fixed and credit you (if you want) | on release |

We ask for a reasonable window (90 days, or until a fix ships) before you disclose publicly.

### Scope

In scope: the API (`apps/api`), the web app (`apps/web`), the mobile app (`apps/mobile`), and the shared packages, as built from this repository, plus our deployed environments once they exist.

Out of scope: denial of service by volume, social engineering of our staff or users, physical attacks, findings that need a rooted or jailbroken device or an already-compromised account, automated scanner output without a demonstrated impact, and third-party services we use (report those to the vendor).

### Safe harbour

If you act in good faith, stay within scope, avoid privacy violations and service disruption, and do not access or keep more data than you need to show the problem, we will not pursue legal action and will work with you to fix it.

## Supported versions

Only the latest release of each app, and the `main` and `dev` branches, receive security fixes.

## For contributors

The rules are in [CONTRIBUTING.md](CONTRIBUTING.md#security-rules). How each control is enforced and tested, and the known gaps, are in [docs/security/checklist.md](docs/security/checklist.md). Automated checks (CodeQL, secret scanning, dependency audit) run from [`.github/workflows/security.yml`](.github/workflows/security.yml).
