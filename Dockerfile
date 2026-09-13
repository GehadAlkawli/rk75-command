FROM node:22-alpine

WORKDIR /gateway

# JustRunMy.App uses this small gateway container. The full RK75 application
# remains on Cloudflare, where its D1, R2, and Worker secrets are available.
# JustRunMy reserves /app for its persistent volume, so the gateway lives
# outside that mount and cannot be replaced by an older persisted file.
COPY deploy/justrunmy/server.mjs ./server.mjs

ENV NODE_ENV=production
ENV PORT=8080
ENV UPSTREAM_ORIGIN=https://rk75-command.rk75command.workers.dev

EXPOSE 8080

CMD ["node", "server.mjs"]
