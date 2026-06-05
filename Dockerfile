# syntax=docker/dockerfile:1.7

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8787 \
    LUMINA_DATA_DIR=/data \
    LUMINA_WEB_DIST=/app/apps/web/dist

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --prod=false

COPY . .
RUN pnpm --filter @lumina/web build

RUN addgroup -S -g 10001 lumina \
  && adduser -S -D -H -u 10001 -G lumina lumina \
  && mkdir -p /data \
  && chown -R lumina:lumina /app /data

USER lumina

EXPOSE 8787

CMD ["node", "apps/server/src/index.js"]
