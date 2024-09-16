# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=20.17-alpine
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION} AS base
WORKDIR /usr/local/app
# Define an argument `YARN_CACHE_FOLDER` for the Yarn cache directory
ARG YARN_CACHE_FOLDER=/root/.yarn

# Stage 1: Build interfaces module
FROM base AS interfaces
COPY --link indexer-interfaces/package.json indexer-interfaces/tsconfig*.json yarn.lock ./
COPY --link indexer-interfaces/src src/
# Leverage a cache mount to `YARN_CACHE_FOLDER` to speed up subsequent builds
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER} \
    yarn install --immutable && yarn pack

# Stage 2: Build frontend
FROM base AS build
COPY --link --from=interfaces /usr/local/app/indexer-interfaces-*.tgz ./indexer-interfaces.tgz
COPY --link ./indexer-frontend/. ./
RUN npm install indexer-interfaces.tgz && npm run build

# Stage 3: Create the final image
FROM nginxinc/nginx-unprivileged:1.27.1-alpine AS image

# Copy config and built application from the build stage into the image
COPY --link ./indexer-web-proxy/configs/default.conf /etc/nginx/conf.d/default.conf
COPY --link --from=build /usr/local/app/dist/indexer-frontend/browser /usr/share/nginx/html

# Change the user to nginx
USER nginx

EXPOSE 80
