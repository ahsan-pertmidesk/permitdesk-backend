# -------- Base image --------
FROM node:22-slim AS base
WORKDIR /app

# Install OpenSSL (required by Prisma)
RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

# -------- Prod deps-only layer --------
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma

RUN npm ci \
    && npx prisma generate \
    && npm prune --omit=dev

# -------- Builder (TypeScript compile) --------
FROM base AS builder
COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# -------- Runner --------
FROM node:22-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Runtime deps
RUN apt-get update -y \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN addgroup --system nodejs \
    && adduser --system --ingroup nodejs nodejs

# Copy runtime files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# 👇 ENTRYPOINT
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

USER nodejs

# 👇 THIS IS THE IMPORTANT PART
CMD ["./docker-entrypoint.sh"]