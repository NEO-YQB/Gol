FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=https://api.golino.shop/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
COPY apps/admin-panel/package.json ./apps/admin-panel/
COPY packages/frontend-core/package.json ./packages/frontend-core/

RUN npm install

COPY . .

RUN npm run build --workspace=admin-panel

FROM nginx:stable-alpine

COPY apps/admin-panel/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin-panel/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
