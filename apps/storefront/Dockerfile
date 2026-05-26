# 1. Base Stage: Install dependencies
FROM node:20-slim AS installer
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
COPY apps/storefront/package*.json ./apps/storefront/
COPY packages/database/package*.json ./packages/database/

RUN npm install

# 2. Build Stage
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules
COPY package*.json ./
COPY packages/database ./packages/database
COPY apps/storefront ./apps/storefront

RUN npx prisma generate --schema=packages/database/prisma/schema.prisma && \
    npm run build --workspace=storefront

# 3. Runner Stage
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y openssl curl wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/storefront/next.config.* ./apps/storefront/
COPY --from=builder /app/apps/storefront/package.json ./apps/storefront/
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/node_modules ./node_modules

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

CMD ["npm", "start", "-w", "apps/storefront", "--", "-p", "3001"]
