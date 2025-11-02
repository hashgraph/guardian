# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=20.19.5-alpine
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION} AS base
WORKDIR /usr/local/app
# Define an argument `YARN_CACHE_FOLDER` for the Yarn cache directory
ARG YARN_CACHE_FOLDER=/root/.yarn

# Stage 1: Build interfaces module
FROM base AS interfaces
COPY --link indexer-interfaces/package.json indexer-interfaces/tsconfig*.json yarn.lock ./
# Leverage a cache mount to `YARN_CACHE_FOLDER` to speed up subsequent builds
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER} \
    yarn install --immutable
COPY --link indexer-interfaces/src src/
RUN yarn pack

# Stage 2: Build common module
FROM base AS common
COPY --link --from=interfaces /usr/local/app/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --link indexer-common/package.json indexer-common/tsconfig*.json yarn.lock ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/interfaces']='file:/tmp/indexer-interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER} \
    yarn install
COPY --link indexer-common/src src/
RUN yarn pack

# Stage 3: Installing production dependecies
FROM base AS deps
COPY --link --from=interfaces /usr/local/app/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --link --from=common /usr/local/app/indexer-common-*.tgz /tmp/indexer-common.tgz
COPY --link indexer-api-gateway/package.json indexer-api-gateway/tsconfig*.json indexer-api-gateway/Gulpfile.mjs yarn.lock ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/interfaces']='file:/tmp/indexer-interfaces.tgz'; input.dependencies['@indexer/common']='file:/tmp/indexer-common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER},sharing=private \
    yarn install --prod

# Stage 4: Build service
FROM base AS build
COPY --link --from=interfaces /usr/local/app/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --link --from=common /usr/local/app/indexer-common-*.tgz /tmp/indexer-common.tgz
COPY --link --from=deps /usr/local/app/package.json /usr/local/app/tsconfig*.json /usr/local/app/Gulpfile.mjs /usr/local/app/yarn.lock ./
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER} \
    yarn install --immutable
COPY --link indexer-api-gateway/environments environments/
COPY --link indexer-api-gateway/src src/
RUN yarn run build:prod

# Stage 5: Create the final image
FROM node:${NODE_VERSION} AS image
WORKDIR /usr/local/app
ENV NODE_ENV=production

# Copy the production dependencies from the deps stage and the built application from the build stage into the image
COPY --link --from=deps /usr/local/app/node_modules node_modules/
COPY --link --from=deps /usr/local/app/package.json ./
COPY --link --from=build /usr/local/app/dist dist/

# Change the user to node
USER node

CMD [ "node", "dist/index.js" ]
