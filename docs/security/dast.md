# DAST: ZAP baseline against the local stack

A passive OWASP ZAP scan (spider plus passive rules, no attack payloads) of the API and the web app running on your own machine. It finds things like missing headers, cookie flags and information leaks. It does **not** replace the authenticated tests in `apps/api/src/security/`.

**Local only.** `scripts/security/zap-baseline.sh` refuses any target that is not `localhost`, `127.0.0.1` or `host.docker.internal`. Do not scan staging or production with it.

## Run it locally

Needs Docker and the repo's pnpm setup.

```bash
scripts/security/dast-stack.sh up        # compose infra, migrations, seed, API :3001, web :3000
scripts/security/zap-baseline.sh api
scripts/security/zap-baseline.sh web
scripts/security/dast-stack.sh down
```

Reports are written to `zap-reports/` (`zap-<api|web>.html`, `.json`, `.md`; gitignored). The first run pulls the ZAP image, about 1 GB; it is pinned by digest in `zap-baseline.sh`.

If you already have the stack running (for example `pnpm dev` and `docker compose up`), skip `dast-stack.sh` and run the scan scripts only. On Docker Desktop (Windows, macOS) the container reaches your machine as `host.docker.internal`; the script handles that.

## Run it in CI

**Actions → "DAST (ZAP baseline, local stack)" → Run workflow.** It is manual only and takes no inputs. It builds the same throwaway stack on the runner and uploads the reports as the `zap-reports` artifact (14 days).

## Reading the result

- `FAIL` and `WARN` lines in the console list the rule, the URL and a count. The `.html` report has the detail.
- Suppressions live in `.zap/rules.tsv`, each with a reason. Add one only when you can say why it is a false positive here.
- Expect findings on the API's JSON responses to be mostly informational (no HTML, so CSP and frame rules do not apply the same way). Anything about cookies, CORS, caching of authenticated pages, or CSP on the web app is worth a ticket.

## Limits

- Passive only, and unauthenticated: it never signs in, so it sees the public surface. Authenticated and object-level checks are the Vitest suites (`route-matrix`, `object-auth`, `api-hygiene`).
- The web app runs as a production build with `LOCAL_API_PROXY=1` (the API is served on the app's origin, as CloudFront does) and `http://` localhost, so HSTS and `upgrade-insecure-requests` are not exercised.
- Not run on every PR: it needs the full stack and ten-plus minutes.
