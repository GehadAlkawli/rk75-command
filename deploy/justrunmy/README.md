# RK75 JustRunMy gateway

This is the independent JustRunMy.App entry point for RK75. It forwards every
page and API request to the Cloudflare production Worker, so the same player
accounts, statistics, media, and administration data are used everywhere.

## Production flow

`GitHub main` → `Cloudflare Worker` → `JustRunMy gateway (HTTPS port 8080)`

GitHub remains the only source-code repository. JustRunMy should build this
repository's root `Dockerfile`, expose container port `8080` as HTTPS, and
start/restart the gateway after each Git deployment.

No application passwords, database credentials, or API keys belong in
JustRunMy. The gateway defaults to the RK75 Cloudflare URL; only set
`UPSTREAM_ORIGIN` if the Cloudflare production address changes.
