# مرحله اول: Build
FROM node:22-alpine AS build

WORKDIR /app

# کپی کردن فایل‌های پیکربندی مونو‌ریپو از ریشه
COPY package.json package-lock.json ./
# کپی کردن فایل پیکربندی اپلیکیشن و پکیج shared قبل از install تا workspace درست resolve شود
COPY apps/admin-panel/package.json ./apps/admin-panel/
COPY packages/frontend-core/package.json ./packages/frontend-core/

# نصب وابستگی‌ها
RUN npm install

# کپی کل پروژه
COPY . .

# بیلد کردن پروژه
RUN npm run build --workspace=admin-panel

# مرحله دوم: Serve با Nginx
FROM nginx:stable-alpine

# کپی کردن فایل‌های بیلد شده به پوشه پیش‌فرض Nginx
COPY --from=build /app/apps/admin-panel/dist /usr/share/nginx/html

# اکسپوز کردن پورت ۸۰ (پورت پیش‌فرض Nginx)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
