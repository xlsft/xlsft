FROM oven/bun:alpine as base

FROM base as builder

WORKDIR /build/app
COPY package*.json ./
COPY bun.lock ./
RUN bun install
COPY app ./
COPY public ./
COPY i18n ./
COPY tsconfig.json ./
COPY nuxt.config.ts ./
COPY global.config.ts ./
COPY server ./
RUN bun run build

WORKDIR /build/content
COPY content/ ./app
COPY global.config.ts ./
RUN bun install
RUN bun run build
COPY content/sanity.server.ts ./app/dist/server.ts

FROM base as worker

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
command=bun serve /workers/content/server.ts
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

ENTRYPOINT ["supervisord", "-c", "/etc/supervisord.conf"]