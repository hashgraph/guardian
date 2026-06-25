# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=20.20.2-alpine

# JS compile: run on the builder's native arch (fast, output is arch-agnostic)
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION} AS base
WORKDIR /usr/local/app
RUN corepack enable

# Production deps: native to the target arch
FROM node:${NODE_VERSION} AS base-target
WORKDIR /usr/local/app
RUN corepack enable

# Stage 1: Install all dependencies for building.
FROM base AS deps-dev
COPY --link package.json yarn.lock .yarnrc.yml ./
COPY --link .yarn .yarn
COPY --link --parents */package.json ./
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=private \
    yarn install --immutable

# Stage 2: Build indexer-interfaces -> indexer-common -> indexer-worker-service.
FROM deps-dev AS build
COPY --link indexer-interfaces/tsconfig*.json indexer-interfaces/
COPY --link indexer-interfaces/src indexer-interfaces/src/
COPY --link indexer-common/tsconfig*.json indexer-common/
COPY --link indexer-common/src indexer-common/src/
COPY --link indexer-worker-service/tsconfig*.json indexer-worker-service/
COPY --link indexer-worker-service/src indexer-worker-service/src/
RUN yarn workspace @indexer/interfaces run build \
 && yarn workspace @indexer/common run build \
 && yarn workspace indexer-worker-service run build:prod

# Stage 3: FOCUSED production install TARGET platform.
FROM base-target AS deps-prod
COPY --link package.json yarn.lock .yarnrc.yml ./
COPY --link .yarn .yarn
COPY --link --parents */package.json ./
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=private \
    yarn workspaces focus --production indexer-worker-service

# Stage 4: Create the final image.
FROM node:${NODE_VERSION} AS image
WORKDIR /usr/local/app
ENV NODE_ENV=production

COPY --link --from=deps-prod /usr/local/app/node_modules ./node_modules/
COPY --link --from=deps-prod /usr/local/app/package.json ./

COPY --link --from=build /usr/local/app/indexer-interfaces/package.json indexer-interfaces/
COPY --link --from=build /usr/local/app/indexer-interfaces/dist indexer-interfaces/dist/
COPY --link --from=build /usr/local/app/indexer-common/package.json indexer-common/
COPY --link --from=build /usr/local/app/indexer-common/dist indexer-common/dist/
COPY --link --from=build /usr/local/app/indexer-worker-service/package.json indexer-worker-service/
COPY --link --from=build /usr/local/app/indexer-worker-service/dist indexer-worker-service/dist/

# Create necessary directories and set permissions
RUN mkdir -p /usr/local/app/indexer-worker-service/dist/migrations && \
    chown -R node:node /usr/local/app

WORKDIR /usr/local/app/indexer-worker-service
USER node

CMD [ "node", "dist/index.js" ]