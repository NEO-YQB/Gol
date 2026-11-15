# Stage 1: Build
FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL=https://api.golino.shop/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ARG VITE_MAP_IR_API_KEY
ENV VITE_MAP_IR_API_KEY=$VITE_MAP_IR_API_KEY
ARG VITE_MAP_IR_STYLE_URL
ENV VITE_MAP_IR_STYLE_URL=$VITE_MAP_IR_STYLE_URL
ARG VITE_MAP_IR_RTL_PLUGIN_URL
ENV VITE_MAP_IR_RTL_PLUGIN_URL=$VITE_MAP_IR_RTL_PLUGIN_URL
ARG VITE_MAP_REVERSE_GEOCODE_URL
ENV VITE_MAP_REVERSE_GEOCODE_URL=$VITE_MAP_REVERSE_GEOCODE_URL
ARG VITE_MAP_REVERSE_GEOCODE_KEY
ENV VITE_MAP_REVERSE_GEOCODE_KEY=$VITE_MAP_REVERSE_GEOCODE_KEY

COPY package.json package-lock.json ./
COPY apps/vendor-panel/package.json ./apps/vendor-panel/
COPY packages/frontend-core/package.json ./packages/frontend-core/

RUN npm install

COPY . .

RUN npm run build --workspace=vendor-panel

# Stage 2: Serve
FROM nginx:alpine

COPY apps/vendor-panel/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/vendor-panel/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
