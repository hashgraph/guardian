# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=20.11.1-alpine
FROM node:${NODE_VERSION} as base
WORKDIR /usr/local/app
# Define an argument `YARN_CACHE_FOLDER` for the Yarn cache directory
ARG YARN_CACHE_FOLDER=/root/.yarn

# Stage 1: Build interfaces module
FROM base as interfaces
COPY --link interfaces/package.json interfaces/tsconfig*.json yarn.lock ./
COPY --link interfaces/src src/
# Leverage a cache mount to /root/.yarn to speed up subsequent builds
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --frozen-lockfile && yarn pack

# Stage 2: Build frontend
FROM base as build
ENV NODE_OPTIONS="--openssl-legacy-provider"
COPY --link --from=interfaces /usr/local/app/guardian-interfaces-*.tgz ./interfaces.tgz
COPY --link ./frontend/. ./
RUN npm install interfaces.tgz && npm run build

# Stage 3: Create the final image
FROM nginxinc/nginx-unprivileged:1.25.4-alpine as image

# Copy config and built application from the build stage into the image
COPY --link ./web-proxy/configs/default.conf /etc/nginx/conf.d/default.conf
COPY --link --from=build /usr/local/app/dist/guardian /usr/share/nginx/html

# Change the user to nginx
USER nginx

EXPOSE 80