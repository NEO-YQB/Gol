# مرحله اول: نصب وابستگی‌ها و بیلد
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# کپی کردن فایل‌های ریشه برای شناسایی Workspaceها
COPY package*.json ./
# کپی کردن فایل‌های پکیج‌های مورد نیاز (اگر پکیج‌های دیگری هم دارید اینجا اضافه کنید)
COPY apps/storefront/package*.json ./apps/storefront/
COPY packages/database/package*.json ./packages/database/

# نصب وابستگی‌ها
RUN npm install

# کپی کل کدها
COPY . .

# --- اضافه شدن این بخش برای حل مشکل Prisma ---
# تولید کلاینت Prisma قبل از بیلد تایپ‌اسکریپت
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma
# --------------------------------------------

# تعریف متغیرها برای زمان بیلد
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# اجرای عملیات بیلد
RUN npm run build -w apps/storefront

# مرحله دوم: اجرا
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# کپی فایل‌های مورد نیاز
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/apps/storefront/package*.json ./apps/storefront/
COPY --from=builder /app/node_modules ./node_modules
# کپی کردن کلاینت تولید شده پریزما برای زمان اجرا (بسیار مهم)
COPY --from=builder /app/packages/database/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs

EXPOSE 3001

CMD ["npx", "next", "start", "apps/storefront", "-p", "3001"]
