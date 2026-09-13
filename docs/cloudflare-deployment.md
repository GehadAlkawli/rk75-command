# RK75 production deployment

The GitHub repository is the source of truth. Cloudflare Workers runs the application, D1 stores application data, and R2 stores uploaded screenshots, listings, and media.

## Production resources

- Worker: `rk75-command`
- D1 database: `rk75-command-db`
- R2 bucket: `rk75-files`
- Public Worker URL: `https://rk75-command.rk75command.workers.dev`

## Safe release sequence

1. Build the application with `npm run build`.
2. Apply database migrations with `npm run cloudflare:migrate`.
3. Store all runtime secrets in Cloudflare Worker secrets, never in GitHub source files.
4. Deploy the Worker with `npm run cloudflare:deploy` using the versioned configuration in `deploy/cloudflare/wrangler.jsonc`.
5. Smoke-test the public home page, player authentication, admin authentication, statistics, file upload, media, and account listing features.
6. Only after the new deployment passes, move the live audience to the Cloudflare URL or a custom domain.

## GitHub-controlled releases

The GitHub repository is the only source-code control point. A push to `main`
always runs the build and type checks. When the two GitHub repository secrets
below are present, the same push also applies pending D1 migrations and deploys
to Cloudflare automatically. The **Run workflow** button is available for a
manual release.

- `CLOUDFLARE_API_TOKEN` — a Cloudflare API token limited to this account's
  Workers, D1, and R2 deployment tasks.
- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account identifier (not a secret,
  but kept as an Actions secret to keep workflow configuration simple).

Cloudflare remains the production runtime. JustRunMy.App may run the root
`Dockerfile` as a lightweight HTTPS gateway on container port `8080`. It
forwards requests to this Worker and does not hold a second database, upload
bucket, or any application secrets.

## Secrets

Configure these only in the Cloudflare Worker secret store:

- `ADMIN_ACCESS_PASSWORD`
- `SESSION_SECRET`
- `YOUTUBE_API_KEY`
- Any optional Twitch or Kick credentials

Never commit a production secret to GitHub, `wrangler.jsonc`, or `.env.example`.

## Existing data

The old site remains online during the migration. Export and copy both D1 records and R2 objects before switching traffic so player accounts, submissions, media, and listings remain intact.
