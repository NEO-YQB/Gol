FROM node:22-bookworm-slim AS builder

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
ARG VITE_STOREFRONT_BASE_URL
ENV VITE_STOREFRONT_BASE_URL=$VITE_STOREFRONT_BASE_URL

COPY . .

RUN npm install --include=dev

RUN npm run build -w admin-panel

FROM nginx:alpine

COPY --from=builder /app/apps/admin-panel/dist /usr/share/nginx/html

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
