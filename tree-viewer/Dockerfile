# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=20.11.1-bookworm-slim
FROM node:${NODE_VERSION} as base
WORKDIR /usr/local/app

# Stage 1: Installing production dependecies
FROM base as deps
COPY ./tree-viewer/package.json ./tree-viewer/tsconfig*.json ./yarn.lock ./
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --prod

# Stage 2: Build service
FROM base as build
COPY --from=deps /usr/local/app/package.json /usr/local/app/tsconfig*.json /usr/local/app/yarn.lock ./
COPY ./tree-viewer/src ./src/.
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --frozen-lockfile && yarn run build:prod

# Stage 3: Create the final image
FROM base as image
ENV NODE_ENV production

COPY ./tree-viewer/public ./public

COPY --from=deps /usr/local/app/node_modules ./node_modules
COPY --from=deps /usr/local/app/package.json ./
COPY --from=build /usr/local/app/dist ./dist

CMD [ "node", "dist/index.js" ]