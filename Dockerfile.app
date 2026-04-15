FROM oven/bun:alpine AS builder

WORKDIR /app
COPY package.json bun.lockb* ./

RUN bun install
COPY . .
RUN bun run build
FROM node:alpine AS runtime

WORKDIR /app
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/node_modules /app/node_modules
COPY package.json ./

ENTRYPOINT ["node", ".output/server/index.mjs"]
