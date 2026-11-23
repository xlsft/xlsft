FROM node:alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

RUN pnpm install --frozen-lockfile
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm run build

FROM node:alpine AS runtime

WORKDIR /app
# ИИ-ассистент ходит в бесплатные модели через OpenCode CLI 2.x (см. server/utils/useAiOpencode.ts);
# нужен AI_MCP_SECRET в окружении — общий секрет между приложением и локальным opencode
RUN npm install -g @opencode/cli@2.0.24
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/node_modules /app/node_modules
COPY package.json ./

ENV NODE_OPTIONS="--max-old-space-size=8192"
ENTRYPOINT ["node", ".output/server/index.mjs"]
