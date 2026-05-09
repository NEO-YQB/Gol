# مرحله اول: نصب وابستگی‌ها و بیلد
FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# کپی کردن فایل‌های تنظیمات از ریشه مونو‌ریپو
COPY package*.json ./
COPY apps/storefront/package*.json ./apps/storefront/

# نصب تمام وابستگی‌ها
RUN npm install

# کپی کردن کل کد پروژه برای بیلد
COPY . .

# اجرای بیلد برای پروژه storefront
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build -w apps/storefront

# مرحله دوم: اجرا
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# کپی کردن فایل‌های لازم برای اجرا از مرحله قبل
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/apps/storefront/package*.json ./apps/storefront/
COPY --from=builder /app/node_modules ./node_modules

# تعیین پورت اجرا
EXPOSE 3001

# دستور اجرای Next.js روی پورت 3001
WORKDIR /app/apps/storefront
CMD ["npm", "start"]
