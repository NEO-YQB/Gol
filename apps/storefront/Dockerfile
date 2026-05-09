# 1. Base Stage: Install dependencies
FROM node:20-slim AS installer
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

# کپی کردن فایل‌های ضروری برای نصب پکیج‌ها
COPY package*.json ./
# اگر فایل turbo.json ندارید، این خط حذف شده است. 
# اگر فایل‌های دیگری در ریشه دارید که برای نصب لازم است اینجا اضافه کنید.

COPY apps/storefront/package*.json ./apps/storefront/
COPY packages/database/package*.json ./packages/database/

RUN npm install

# 2. Build Stage
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

# کپی کردن node_modules از مرحله قبل
COPY --from=installer /app/node_modules ./node_modules
COPY package*.json ./

# کپی کردن پوشه‌های مورد نیاز به صورت مجزا
COPY packages/database ./packages/database
COPY apps/storefront ./apps/storefront

# اطمینان از اینکه هیچ پوشه بک‌ا‌ند یا ادمینی به اشتباه وارد بیلد نمی‌شود
RUN rm -rf apps/backend apps/admin-panel

# تولید کلاینت پریزما و بیلد (ترکیب شده برای اطمینان از ترتیب)
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma && \
    npm run build --workspace=storefront

# 3. Runner Stage
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# کپی فایل‌های خروجی بیلد
COPY --from=builder /app/apps/storefront/next.config.mjs ./
COPY --from=builder /app/apps/storefront/package.json ./
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3001

# دستور اجرا
CMD ["npm", "start", "-w", "apps/storefront", "--", "-p", "3001"]
