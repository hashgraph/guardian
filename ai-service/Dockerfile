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

# Stage 2: Build interfaces -> common -> ai-service.
FROM deps-dev AS build
COPY --link interfaces/tsconfig*.json interfaces/
COPY --link interfaces/src interfaces/src/
COPY --link common/tsconfig*.json common/
COPY --link common/src common/src/
COPY --link ai-service/tsconfig*.json ai-service/
COPY --link ai-service/src ai-service/src/
RUN yarn workspace @guardian/interfaces run build \
 && yarn workspace @guardian/common run build \
 && yarn workspace ai-service run build:prod

# Stage 3: FOCUSED production install TARGET platform.
FROM base-target AS deps-prod
COPY --link package.json yarn.lock .yarnrc.yml ./
COPY --link .yarn .yarn
COPY --link --parents */package.json ./
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=private \
    yarn workspaces focus --production ai-service

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
COPY --link --from=build /usr/local/app/ai-service/package.json ai-service/
COPY --link --from=build /usr/local/app/ai-service/dist ai-service/dist/

WORKDIR /usr/local/app/ai-service
USER node

CMD [ "node", "dist/index.js" ]