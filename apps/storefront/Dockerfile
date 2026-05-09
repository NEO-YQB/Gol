# 1. Base Stage: Install dependencies
FROM node:20-slim AS installer
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# کپی کردن فایل‌های ضروری برای نصب پکیج‌ها
COPY package*.json ./
COPY apps/storefront/package*.json ./apps/storefront/
COPY packages/database/package*.json ./packages/database/

RUN npm install

# 2. Build Stage
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# کپی کردن node_modules و فایل‌های پروژه
COPY --from=installer /app/node_modules ./node_modules
COPY package*.json ./
COPY packages/database ./packages/database
COPY apps/storefront ./apps/storefront

# حذف فایل‌های اضافی برای بیلد تمیز
RUN rm -rf apps/backend apps/admin-panel

# تولید کلاینت پریزما و بیلد Next.js
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma && \
    npm run build --workspace=storefront

# 3. Runner Stage
FROM node:20-slim AS runner
# نصب curl برای Healthcheck پلتفرم Coolify
RUN apt-get update && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# --- بخش حیاتی: کپی فایل‌های ریشه برای شناسایی ورک‌اسپیس ---
COPY --from=builder /app/package*.json ./
# کپی فایل‌های بیلد شده
COPY --from=builder /app/apps/storefront/next.config.* ./apps/storefront/
COPY --from=builder /app/apps/storefront/package.json ./apps/storefront/
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/node_modules ./node_modules

# اصلاح دسترسی کاربر
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001

# دستور اجرا با استفاده از ورک‌اسپیس
CMD ["npm", "start", "-w", "apps/storefront", "--", "-p", "3001"]
