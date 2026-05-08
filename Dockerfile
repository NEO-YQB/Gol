# مرحله بیلد
FROM node:22-bookworm-slim AS builder

# این پوشه کاری در داخل کانتینر است (ربطی به مسیر ویندوز شما ندارد)
WORKDIR /app

# کپی کردن تمام محتویات پوشه Gol به داخل پوشه /app در داکر
COPY . .

# نصب پکیج‌ها در روت مونو‌ریپو
RUN npm install --include=dev

# اجرای بیلد مخصوص اپلیکیشن admin-panel
RUN npm run build -w admin-panel

# مرحله نهایی: وب‌سرور برای سرو کردن فایل‌های استاتیک
FROM nginx:alpine

# کپی کردن فایل‌های تولید شده از مرحله قبل
# مسیر: /app (WORKDIR) + apps/admin-panel (مسیر پروژه) + dist (پوشه خروجی بیلد)
COPY --from=builder /app/apps/admin-panel/dist /usr/share/nginx/html

# تنظیمات Nginx برای جلوگیری از خطای 404 در صورت رفرش صفحات (SPA)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
