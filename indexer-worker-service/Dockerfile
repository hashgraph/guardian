# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=20.16-alpine
FROM node:${NODE_VERSION} as base
WORKDIR /usr/local/app
# Define an argument `YARN_CACHE_FOLDER` for the Yarn cache directory
ARG YARN_CACHE_FOLDER=/root/.yarn

# Stage 1: Build interfaces module
FROM base as interfaces
COPY --link indexer-interfaces/package.json indexer-interfaces/tsconfig*.json yarn.lock ./
COPY --link indexer-interfaces/src src/
# Here and after. Leverage a cache mount to /root/.yarn to speed up subsequent builds
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --immutable && yarn pack

# Stage 2: Build common module
FROM base as common
COPY --link --from=interfaces /usr/local/app/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --link indexer-common/package.json indexer-common/tsconfig*.json yarn.lock ./
COPY --link indexer-common/src src/
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/interfaces']='file:/tmp/indexer-interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --immutable && yarn pack

# Stage 3: Installing production dependecies
FROM base as deps
COPY --link --from=interfaces /usr/local/app/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --link --from=common /usr/local/app/indexer-common-*.tgz /tmp/indexer-common.tgz
COPY --link indexer-worker-service/package.json indexer-worker-service/tsconfig*.json yarn.lock ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/interfaces']='file:/tmp/indexer-interfaces.tgz'; input.dependencies['@indexer/common']='file:/tmp/indexer-common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN --mount=type=cache,target=/root/.yarn,sharing=private \
    yarn install --immutable --prod

# Stage 4: Build service
FROM base as build
COPY --link --from=interfaces /usr/local/app/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --link --from=common /usr/local/app/indexer-common-*.tgz /tmp/indexer-common.tgz
COPY --link --from=deps /usr/local/app/package.json /usr/local/app/tsconfig*.json /usr/local/app/yarn.lock ./
COPY --link indexer-worker-service/src src/
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --immutable && yarn run build:prod

# Stage 5: Create the final image
FROM base as image
ENV NODE_ENV production

# Copy the production dependencies from the deps stage and the built application from the build stage into the image
COPY --link --from=deps /usr/local/app/node_modules node_modules/
COPY --link --from=deps /usr/local/app/package.json ./
COPY --link --from=build /usr/local/app/dist dist/

# Create necessary directories and set permissions
RUN mkdir -p /usr/local/app/dist/migrations && \
    chown -R node:node /usr/local/app

# Change the user to node
USER node

CMD [ "node", "dist/index.js" ]
