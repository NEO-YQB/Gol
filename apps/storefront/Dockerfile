# مرحله اول: نصب وابستگی‌ها و بیلد
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# کپی کردن فایل‌های ریشه برای شناسایی Workspaceها
COPY package*.json ./
# کپی کردن فایل‌های پکیج استورفرانت
COPY apps/storefront/package*.json ./apps/storefront/

# نصب وابستگی‌ها (در سطح ریشه برای استفاده از ورک‌اسپیس)
RUN npm install

# کپی کل کدها (به جز مواردی که در .dockerignore هستند)
COPY . .

# تعریف متغیرها برای زمان بیلد (Build-time variables)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# اجرای عملیات بیلد برای پکیج storefront
RUN npm run build -w apps/storefront

# مرحله دوم: اجرا
FROM node:20-alpine AS runner
WORKDIR /app

# تنظیم متغیرهای محیطی برای اجرا
ENV NODE_ENV=production
ENV PORT=3001

# ایجاد یک کاربر غیر ریشه برای امنیت بیشتر
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# کپی فایل‌های مورد نیاز از مرحله بیلد
COPY --from=builder /app/apps/storefront/public ./apps/storefront/public
COPY --from=builder /app/apps/storefront/.next ./apps/storefront/.next
COPY --from=builder /app/apps/storefront/package*.json ./apps/storefront/
COPY --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 3001

# اجرای Next.js
CMD ["npx", "next", "start", "apps/storefront", "-p", "3001"]
