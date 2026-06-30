# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=24.18.0-alpine

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

# Stage 2: Build interfaces -> common -> queue-service.
FROM deps-dev AS build
COPY --link interfaces/tsconfig*.json interfaces/
COPY --link interfaces/src interfaces/src/
COPY --link common/tsconfig*.json common/
COPY --link common/src common/src/
COPY --link queue-service/tsconfig*.json queue-service/
COPY --link queue-service/src queue-service/src/
RUN yarn workspace @guardian/interfaces run build \
 && yarn workspace @guardian/common run build \
 && yarn workspace queue-service run build:prod

# Stage 3: FOCUSED production install TARGET platform.
FROM base-target AS deps-prod
COPY --link package.json yarn.lock .yarnrc.yml ./
COPY --link .yarn .yarn
COPY --link --parents */package.json ./
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=private \
    yarn workspaces focus --production queue-service

# Stage 4: Create the final image.
FROM node:${NODE_VERSION} AS image
WORKDIR /usr/local/app
ENV NODE_ENV=production

COPY --link --from=deps-prod /usr/local/app/node_modules ./node_modules/
COPY --link --from=deps-prod /usr/local/app/package.json ./

COPY --link --from=build /usr/local/app/interfaces/package.json interfaces/
COPY --link --from=build /usr/local/app/interfaces/dist interfaces/dist/
COPY --link --from=build /usr/local/app/common/package.json common/
COPY --link --from=build /usr/local/app/common/dist common/dist/
COPY --link --from=build /usr/local/app/queue-service/package.json queue-service/
COPY --link --from=build /usr/local/app/queue-service/dist queue-service/dist/

WORKDIR /usr/local/app/queue-service
USER node

CMD [ "node", "dist/index.js" ]