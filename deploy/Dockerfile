FROM node:alpine AS builder

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV NODE_OPTIONS="--max-old-space-size=8192"
RUN pnpm run build

FROM node:alpine AS runtime

WORKDIR /app
RUN npm install -g @opencode/cli@2.0.24
RUN apk add --no-cache libreoffice-writer ttf-dejavu fontconfig \
    && wget -qO /tmp/cascadia.zip https://github.com/microsoft/cascadia-code/releases/download/v2407.24/CascadiaCode-2407.24.zip \
    && mkdir -p /usr/share/fonts/cascadia \
    && unzip -q -j -o /tmp/cascadia.zip ttf/static/CascadiaCode-Regular.ttf ttf/static/CascadiaCode-Bold.ttf -d /usr/share/fonts/cascadia \
    && rm /tmp/cascadia.zip && fc-cache -f
ENV NUXT_LIBREOFFICE_BIN=/usr/lib/libreoffice/program/soffice
COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/node_modules /app/node_modules
COPY package.json ./

ENV NODE_OPTIONS="--max-old-space-size=8192"
ENTRYPOINT ["node", ".output/server/index.mjs"]
