# 1. Base Stage: Install dependencies
FROM node:20-slim AS installer
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

# کپی کردن فایل‌های پیکربندی روت مونو‌ریپو
COPY package*.json ./
COPY turbo.json ./

# کپی کردن package.jsonهای پکیج‌های مورد نیاز (بسیار مهم برای نصب صحیح وابستگی‌ها)
COPY apps/storefront/package*.json ./apps/storefront/
COPY packages/database/package*.json ./packages/database/

# نصب تمامی وابستگی‌ها
RUN npm install

# 2. Build Stage
FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

# کپی کردن کل کد منبع (بعد از نصب وابستگی‌ها برای استفاده از کش لایه‌ها)
COPY --from=installer /app/node_modules ./node_modules
COPY . .

# مرحله حیاتی: تولید کلاینت پریزما قبل از بیلد اپلیکیشن
# این خط باید دقیقاً قبل از دستور build باشد

RUN rm -rf apps/backend apps/admin-panel
COPY packages/database/prisma/schema.prisma ./packages/database/prisma/schema.prisma

# ادغام برای اطمینان از ترتیب و عدم استفاده از کش اشتباه
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma && \
    npm run build --workspace=storefront

# در مرحله Runner (بسیار مهم)
# به جای کپی تک تک فایل‌ها، اگر حجم کانتینر خیلی برایتان مهم نیست:
COPY --from=builder /app/node_modules ./node_modules
# یا حداقل مطمئن شوید کل پکیج پریزما کپی شده:
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# 3. Runner Stage
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# ایجاد یک کاربر غیر ریشه برای امنیت بیشتر
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# کپی فایل‌های ضروری از مرحله قبل
COPY --from=builder /app/apps/storefront/next.config.mjs ./
COPY --from=builder /app/apps/storefront/package.json ./
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/node_modules ./node_modules

# کپی کردن کلاینت تولید شده پریزما به مرحله نهایی (بسیار مهم برای زمان اجرا)
COPY --from=builder /app/packages/database/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

# اجرای اپلیکیشن
CMD ["npm", "start", "-w", "apps/storefront", "--", "-p", "3001"]
