FROM node:24-slim AS web-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
COPY shared /app/shared
RUN npm run build

FROM node:24-slim AS server-deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json ./server/package.json
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/src ./server/src
COPY shared ./shared
COPY --from=web-build /app/web/dist ./web/dist

EXPOSE 3000
CMD ["node", "server/src/index.ts"]
