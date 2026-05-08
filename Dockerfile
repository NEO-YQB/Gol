# مرحله بیلد
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# ابتدا کل پروژه را کپی می‌کنیم (برای مونو‌ریپو این روش مطمئن‌تر است)
COPY . .

# نصب تمام وابستگی‌ها (شامل روت و ورک‌اسپیس‌ها)
# استفاده از --include=dev برای اطمینان از نصب Vite و TypeScript
RUN npm install --include=dev

# اجرای بیلد با استفاده از ورک‌اسپیس
RUN npm run build -w admin-panel

# مرحله نهایی: وب‌سرور Nginx
FROM nginx:alpine

# کپی فایل‌های بیلد شده (مسیر خروجی را مطابق ساختار پروژه چک کنید)
# معمولاً در مونو‌ریپوها مسیر اینجاست:
COPY --from=builder /apps/admin-panel/dist /usr/share/nginx/html

# تنظیم Nginx برای SPA
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
