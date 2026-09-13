# RK75 Command

RK75 Command is a bilingual Fate War tracker. GitHub is the source of truth;
Cloudflare Workers is the primary production runtime, D1 stores structured
data, and R2 stores screenshots, account media, and RK Media uploads.
JustRunMy.App can provide an additional public HTTPS gateway on port 8080.

## Run it locally

1. Install Node.js 22 or later.
2. Copy `.env.example` to `.dev.vars` and fill in local-only values. Never
   commit this file.
3. Run `npm install`.
4. Run `npm run dev`.

## Check a change before publishing

```bash
npm run build
npx tsc --noEmit
```

## Publish from GitHub

Push the approved change to `main`. GitHub Actions builds and type-checks every
push. Once the repository has the Cloudflare deployment secrets documented in
`docs/cloudflare-deployment.md`, the same push publishes it automatically.
You can also select **Actions → RK75 Cloudflare release → Run workflow** to
publish manually.

## Important

- Do not commit passwords, API keys, or `.dev.vars`.
- Use Cloudflare Worker secrets for production values.
- Apply database changes through `npm run cloudflare:migrate` before a release.
- The production configuration is `deploy/cloudflare/wrangler.jsonc`.
- JustRunMy runs only the gateway defined in the root `Dockerfile`; it does not
  store RK75 data or secrets.
