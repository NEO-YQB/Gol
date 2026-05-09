# 1. Base Stage: Install dependencies
FROM node:20-slim AS installer
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

COPY package*.json ./
COPY turbo.json ./
COPY apps/storefront/package*.json ./apps/storefront/
COPY packages/database/package*.json ./packages/database/

RUN npm install

# 2. Build Stage
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

# کپی کردن وابستگی‌ها از مرحله قبل
COPY --from=installer /app/node_modules ./node_modules
# کپی کردن فایل‌های ضروری به صورت انتخابی برای جلوگیری از تداخل
COPY package*.json ./
COPY turbo.json ./
COPY packages/database ./packages/database
COPY apps/storefront ./apps/storefront

# تولید کلاینت پریزما و بیلد اپلیکیشن در یک مرحله برای اطمینان از ترتیب
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma && \
    npm run build --workspace=storefront

# 3. Runner Stage
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# کپی فایل‌های مورد نیاز برای اجرای Next.js
COPY --from=builder /app/apps/storefront/next.config.mjs ./
COPY --from=builder /app/apps/storefront/package.json ./
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next

# کپی کردن کل node_modules و کلاینت پریزما برای اطمینان از وجود تمام وابستگی‌ها در ران‌تایم
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3001
ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

CMD ["npm", "start", "-w", "apps/storefront", "--", "-p", "3001"]
