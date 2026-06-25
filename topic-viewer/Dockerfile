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

# Stage 2: Build topic-viewer.
FROM deps-dev AS build
COPY --link topic-viewer/tsconfig*.json topic-viewer/
COPY --link topic-viewer/src topic-viewer/src/
RUN yarn workspace topic-viewer run build:prod

# Stage 3: FOCUSED production install TARGET platform.
FROM base-target AS deps-prod
COPY --link package.json yarn.lock .yarnrc.yml ./
COPY --link .yarn .yarn
COPY --link --parents */package.json ./
RUN --mount=type=cache,target=/root/.yarn/berry/cache,sharing=private \
    yarn workspaces focus --production topic-viewer

# Stage 4: Create the final image.
FROM node:${NODE_VERSION} AS image
WORKDIR /usr/local/app
ENV NODE_ENV=production

COPY --link --from=deps-prod /usr/local/app/node_modules ./node_modules/
COPY --link --from=deps-prod /usr/local/app/package.json ./

COPY --link --from=build /usr/local/app/topic-viewer/package.json topic-viewer/
COPY --link --from=build /usr/local/app/topic-viewer/dist topic-viewer/dist/
COPY --link topic-viewer/public topic-viewer/public/

WORKDIR /usr/local/app/topic-viewer
USER node

CMD [ "node", "dist/index.js" ]