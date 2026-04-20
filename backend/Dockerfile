# =============================================================
# Backend (NestJS) — Docker build
# Build context: Joy/backend/
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Force development so devDependencies (@nestjs/cli, typescript, etc.) are installed
ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

# =============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only install production deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force && apk add --no-cache wget

COPY --from=builder /app/dist ./dist

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1

CMD ["node", "dist/main.js"]
