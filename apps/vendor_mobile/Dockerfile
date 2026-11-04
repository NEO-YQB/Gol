# Stage 1: Build Flutter Web
FROM ghcr.io/cirruslabs/flutter:stable AS build

WORKDIR /app

# Enable web support
RUN flutter config --enable-web

# Copy dependency files first for layer caching
COPY apps/vendor_mobile/pubspec.yaml apps/vendor_mobile/pubspec.lock ./
COPY apps/vendor_mobile/third_party ./third_party

# Resolve packages
RUN flutter pub get

# Copy the entire vendor_mobile app
COPY apps/vendor_mobile/ ./

# Build Flutter Web Release
RUN flutter build web --release --web-renderer canvaskit

# Stage 2: Serve with lightweight Nginx
FROM nginx:alpine

# Copy custom nginx configuration (No-Index, caching, SPA fallback)
COPY apps/vendor_mobile/nginx.conf /etc/nginx/conf.d/default.conf

# Copy web release artifacts
COPY --from=build /app/build/web /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
