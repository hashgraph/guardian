# syntax=docker/dockerfile:1
# Stage 0: # Define the versions of the base images used
ARG NODE_VERSION=20.20.2-alpine
ARG NGINX_VERSION=1.27.5-alpine

FROM --platform=$BUILDPLATFORM node:${NODE_VERSION} AS base
WORKDIR /usr/local/app
RUN corepack enable

# Stage 1: Install workspace deps for building.
FROM base AS deps-dev
COPY --link package.json yarn.lock .yarnrc.yml ./
COPY --link .yarn .yarn
COPY --link --parents */package.json ./
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=private \
    yarn install --immutable

# Stage 2: Build and pack the indexer-interfaces module.
FROM deps-dev AS interfaces
COPY --link indexer-interfaces/tsconfig*.json indexer-interfaces/
COPY --link indexer-interfaces/src indexer-interfaces/src/
RUN yarn workspace @indexer/interfaces pack --out /usr/local/app/indexer-interfaces.tgz

# Stage 3: Build and pack the indexer-common module (depends on indexer-interfaces).
FROM interfaces AS common
COPY --link indexer-common/tsconfig*.json indexer-common/
COPY --link indexer-common/src indexer-common/src/
RUN yarn workspace @indexer/common pack --out /usr/local/app/indexer-common.tgz

# Stage 4: Build frontend
FROM base AS build
COPY --link --from=interfaces /usr/local/app/indexer-interfaces.tgz ./indexer-interfaces.tgz
COPY --link --from=common /usr/local/app/indexer-common.tgz ./indexer-common.tgz
COPY --link ./indexer-frontend/. ./
RUN npm install indexer-interfaces.tgz && npm install indexer-common.tgz && npm run build

# Stage 5: Create the final image
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS image

# Copy config and built application from the build stage into the image
COPY --link ./indexer-web-proxy/configs/default.conf /etc/nginx/conf.d/default.conf
COPY --link --from=build /usr/local/app/dist/indexer-frontend/browser /usr/share/nginx/html

EXPOSE 80
