FROM node:22-bookworm-slim AS installer
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/database/package*.json ./packages/database/

RUN npm install --include=optional

FROM node:22-bookworm-slim AS builder
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules
COPY package*.json ./
COPY apps/backend ./apps/backend
COPY packages/database ./packages/database

RUN npx prisma generate --schema=packages/database/prisma/schema.prisma && \
    npm run build -w packages/database -w apps/backend

FROM node:22-bookworm-slim AS runner
RUN apt-get update && apt-get install -y openssl curl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --schema=packages/database/prisma/schema.prisma && npm run start:prod -w apps/backend"]
