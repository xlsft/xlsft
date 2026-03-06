FROM oven/bun:alpine AS base

FROM base AS builder

WORKDIR /build/app
COPY package*.json ./
COPY bun.lock ./
RUN bun install
COPY app ./
COPY public ./
COPY bot ./
COPY i18n ./
COPY tsconfig.json ./
COPY nuxt.config.ts ./
COPY global.config.ts ./
COPY server ./
RUN bun run build

WORKDIR /build/content
COPY content ./app
COPY global.config.ts ./
RUN bun install
RUN bun run build

WORKDIR /build/bot
COPY bot ./app
COPY global.config.ts ./
COPY i18n ./
RUN bun install
RUN bun run build

FROM base AS worker

RUN apk add --no-cache supervisor
RUN cat <<EOF > /etc/supervisord.conf
[supervisord]
nodaemon=true

[program:app]
command=bun /workers/app/server/index.mjs
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stdout_logfile=/dev/stdout
stderr_logfile=/dev/stderr

[program:content]
command=bun serve /workers/content/server.mjs
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stdout_logfile=/dev/stdout
stderr_logfile=/dev/stderr

[program:bot]
command=bun /workers/bot/index.js
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
stdout_logfile=/dev/stdout
stderr_logfile=/dev/stderr
EOF

WORKDIR /workers

COPY --from=builder /build/app/.output/ ./app
COPY --from=builder /build/content/dist/ ./content
COPY --from=builder /build/bot/dist/ ./bot

ENTRYPOINT ["supervisord", "-c", "/etc/supervisord.conf"]