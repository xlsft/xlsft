# Используем Bun для сборки
FROM oven/bun:alpine AS builder

WORKDIR /app

# Копируем только package.json и bun.lockb для кэширования зависимостей
COPY package.json bun.lockb* ./

RUN bun install

# Копируем исходники и билдим Nuxt
COPY . .
RUN bun run build

# Финальный образ на Node.js
FROM node:alpine AS runtime

WORKDIR /app

# Копируем только нужное из билд-образа
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/node_modules /app/node_modules
COPY package.json ./

# Запуск через Node.js
ENTRYPOINT ["node", ".output/server/index.mjs"]