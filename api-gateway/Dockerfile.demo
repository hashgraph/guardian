# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=20.19.5-alpine
FROM --platform=$BUILDPLATFORM node:${NODE_VERSION} AS base
WORKDIR /usr/local/app
# Define an argument `YARN_CACHE_FOLDER` for the Yarn cache directory
ARG YARN_CACHE_FOLDER=/root/.yarn

# Stage 1: Build interfaces module
FROM base AS interfaces
COPY --link interfaces/package.json interfaces/tsconfig*.json yarn.lock ./
# Leverage a cache mount to `YARN_CACHE_FOLDER` to speed up subsequent builds
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER} \
    yarn install --immutable
COPY --link interfaces/src src/
RUN yarn pack

# Stage 2: Build common module
FROM base AS common
COPY --link --from=interfaces /usr/local/app/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --link common/package.json common/tsconfig*.json yarn.lock ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER} \
    yarn install
COPY --link common/src src/
RUN yarn pack

# Stage 3: Installing production dependecies
FROM base AS deps
COPY --link --from=interfaces /usr/local/app/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --link --from=common /usr/local/app/guardian-common-*.tgz /tmp/common.tgz
COPY --link api-gateway/package.json api-gateway/tsconfig*.json api-gateway/Gulpfile.mjs yarn.lock ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER},sharing=private \
    yarn install --prod

# Stage 4: Build service
FROM base AS build
COPY --link --from=interfaces /usr/local/app/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --link --from=common /usr/local/app/guardian-common-*.tgz /tmp/common.tgz
COPY --link --from=deps /usr/local/app/package.json /usr/local/app/tsconfig*.json /usr/local/app/Gulpfile.mjs /usr/local/app/yarn.lock ./
RUN --mount=type=cache,target=${YARN_CACHE_FOLDER},sharing=private \
    yarn install --immutable
COPY --link api-gateway/environments environments/
COPY --link api-gateway/src src/
RUN yarn run build:demo

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
