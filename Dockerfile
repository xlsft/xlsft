FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS prod
WORKDIR /app
COPY .npmrc ./
COPY package*.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base
WORKDIR /app
COPY --from=prod /app/node_modules /app/node_modules
COPY --from=prod /app/.output /app/.output
CMD ["node", ".output/server/index.mjs"]