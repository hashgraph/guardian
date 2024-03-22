# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=20.11.1-bookworm-slim
FROM node:${NODE_VERSION} as base
WORKDIR /usr/local/app

# Stage 1: Build interfaces module
FROM base as interfaces
COPY --link interfaces/package.json interfaces/tsconfig*.json yarn.lock ./
COPY --link interfaces/src src/
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --frozen-lockfile && yarn pack

# Stage 2: Build common module
FROM base as common
COPY --link --from=interfaces /usr/local/app/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --link common/package.json common/tsconfig*.json yarn.lock ./
COPY --link common/src src/
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN --mount=type=cache,target=/root/.yarn \
    yarn install && yarn pack

# Stage 3: Installing production dependecies
FROM base as deps
COPY --link --from=interfaces /usr/local/app/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --link --from=common /usr/local/app/guardian-common-*.tgz /tmp/common.tgz
COPY --link policy-service/package.json policy-service/tsconfig*.json yarn.lock ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --prod

# Stage 4: Build service
FROM base as build
COPY --link --from=interfaces /usr/local/app/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --link --from=common /usr/local/app/guardian-common-*.tgz /tmp/common.tgz
COPY --link --from=deps /usr/local/app/package.json /usr/local/app/tsconfig*.json /usr/local/app/yarn.lock ./
COPY --link policy-service/src src/
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --frozen-lockfile && yarn run build:prod && rm /tmp/interfaces.tgz /tmp/common.tgz

# Stage 5: Create the final image
FROM base as image
ENV NODE_ENV production

COPY --link --from=deps /usr/local/app/node_modules node_modules/
COPY --link --from=deps /usr/local/app/package.json ./
COPY --link --from=build /usr/local/app/dist dist/

CMD [ "node", "dist/index.js" ]