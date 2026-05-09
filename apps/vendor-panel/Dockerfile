# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

# کپی فایل‌های مدیریت پکیج از ریشه مونو‌ریپو
COPY package.json package-lock.json ./
COPY apps/vendor-panel/package.json ./apps/vendor-panel/
COPY packages/frontend-core/package.json ./packages/frontend-core/

# نصب وابستگی‌ها در کل مونو‌ریپو
RUN npm install

# کپی کل کد پروژه
COPY . .

# ساخت پروژه برای تولید
RUN npm run build --workspace=vendor-panel

# Stage 2: Serve
FROM nginx:alpine

# کپی فایل‌های ساخته شده به پوشه استاندارد انجین‌اکس
COPY --from=build /app/apps/vendor-panel/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
