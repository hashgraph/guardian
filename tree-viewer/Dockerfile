# syntax=docker/dockerfile:1
# Stage 0: Use node image for base image for all stages
ARG NODE_VERSION=20.11.1-alpine
FROM node:${NODE_VERSION} as base
WORKDIR /usr/local/app
# Define an argument `YARN_CACHE_FOLDER` for the Yarn cache directory
ARG YARN_CACHE_FOLDER=/root/.yarn

# Stage 1: Installing production dependecies
FROM base as deps
COPY --link tree-viewer/package.json tree-viewer/tsconfig*.json yarn.lock ./
# Here and after. Leverage a cache mount to /root/.yarn to speed up subsequent builds
RUN --mount=type=cache,target=/root/.yarn,sharing=private \
    yarn install --prod

# Stage 2: Build service
FROM base as build
COPY --link --from=deps /usr/local/app/package.json /usr/local/app/tsconfig*.json /usr/local/app/yarn.lock ./
COPY --link tree-viewer/src src/
RUN --mount=type=cache,target=/root/.yarn \
    yarn install --frozen-lockfile && yarn run build:prod

# Stage 3: Create the final image
FROM base as image
ENV NODE_ENV production

COPY --link tree-viewer/public public/

# Copy the production dependencies from the deps stage and the built application from the build stage into the image
COPY --link --from=deps /usr/local/app/node_modules node_modules/
COPY --link --from=deps /usr/local/app/package.json ./
COPY --link --from=build /usr/local/app/dist dist/

# Change the user to node
USER node

CMD [ "node", "dist/index.js" ]