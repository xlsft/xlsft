FROM oven/bun:alpine AS base

FROM base AS builder

WORKDIR /app
COPY . .

RUN bun install
RUN bun run build

ENTRYPOINT [ "bun", ".output/server/index.mjs" ]