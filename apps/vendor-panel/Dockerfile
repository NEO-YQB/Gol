# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# کپی فایل‌های مدیریت پکیج از ریشه مونو‌ریپو
COPY package*.json ./
COPY apps/vendor-panel/package*.json ./apps/vendor-panel/

# نصب وابستگی‌ها در کل مونو‌ریپو (با تمرکز روی وندور پنل)
RUN npm install

# کپی کل کد پروژه
COPY . .

# ساخت پروژه برای تولید
RUN npm run build -w apps/vendor-panel

# Stage 2: Serve
FROM nginx:alpine

# کپی فایل‌های ساخته شده به پوشه استاندارد انجین‌اکس
# دقت کنید که خروجی Vite معمولا در پوشه dist قرار می‌گیرد
COPY --from=build /app/apps/vendor-panel/dist /usr/share/nginx/html

# کپی کانفیگ انجین‌اکس (اگر برای Admin Panel ساخته بودید، همان را اینجا هم استفاده کنید)
# اگر فایل nginx.conf اختصاصی ندارید، این خط را فعلا کامنت کنید
# COPY apps/vendor-panel/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
