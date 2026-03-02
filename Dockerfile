FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app/main
COPY .npmrc ./
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY app ./
COPY public ./
COPY i18n ./
COPY tsconfig.json ./
COPY nuxt.config.ts ./
COPY global.config.ts ./
# COPY server ./
RUN pnpm build

WORKDIR /app/content
COPY content/ ./
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM base
WORKDIR /app

COPY --from=builder /app/.output/ /app/main
CMD ["node", "main/server/index.mjs"]