# مرحله بیلد
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# کپی فایل‌های اصلی برای نصب وابستگی‌ها
COPY package*.json ./
# اگر فایل‌های دیگر در روت دارید مثل turborepo یا ... کپی کنید
RUN npm install

# کپی کل پروژه
COPY . .

# اجرای بیلد پنل ادمین (نام ورک‌اسپیس را چک کنید)
RUN npm run build -w admin-panel

# مرحله نهایی: وب‌سرور Nginx
FROM nginx:alpine
# کپی فایل‌های بیلد شده از مرحله قبل
COPY --from=builder /app/apps/admin-panel/dist /usr/share/nginx/html

# تنظیم Nginx برای SPA (حل مشکل مسیرها)
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
