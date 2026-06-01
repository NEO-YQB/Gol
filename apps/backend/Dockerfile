FROM node:22-bookworm-slim AS installer
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    build-essential \
    pkg-config \
    libvips-dev \
    libglib2.0-dev \
    libexpat1-dev \
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    libtiff-dev \
    libgif-dev \
    libheif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV npm_config_build_from_source=true
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=0
ENV npm_config_platform=linux
ENV npm_config_arch=x64

COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/database/package*.json ./packages/database/

RUN npm install --include=optional --foreground-scripts

FROM node:22-bookworm-slim AS builder
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    openssl \
    python3 \
    make \
    g++ \
    build-essential \
    pkg-config \
    libvips-dev \
    libglib2.0-dev \
    libexpat1-dev \
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    libtiff-dev \
    libgif-dev \
    libheif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV npm_config_build_from_source=true
ENV SHARP_IGNORE_GLOBAL_LIBVIPS=0
ENV npm_config_platform=linux
ENV npm_config_arch=x64

COPY --from=installer /app/node_modules ./node_modules
COPY package*.json ./
COPY apps/backend ./apps/backend
COPY packages/database ./packages/database

RUN npx prisma generate --schema=packages/database/prisma/schema.prisma && \
    npm run build -w packages/database -w apps/backend

FROM node:22-bookworm-slim AS runner
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    libvips \
    libglib2.0-0 \
    libexpat1 \
    libjpeg62-turbo \
    libpng16-16 \
    libwebp7 \
    libtiff6 \
    libgif7 \
    libheif1 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/backend/package.json ./apps/backend/
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --schema=packages/database/prisma/schema.prisma && npm run start:prod -w apps/backend"]
