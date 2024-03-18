ARG NODE_VERSION=20.11.1-bookworm-slim

# Stage 1: Build tree viewer service
FROM node:${NODE_VERSION} as treeViewerbuilder
WORKDIR /usr/local/srv
COPY ./tree-viewer/package.json ./tree-viewer/tsconfig*.json ./yarn.lock ./package-lock.json ./
COPY ./tree-viewer/src ./src
RUN yarn install && yarn run build:prod

# Stage 2: Create the final image
FROM node:${NODE_VERSION}
ENV PLATFORM="docker" NODE_ENV="production"
WORKDIR /usr/local/tree-viewer
COPY --from=treeViewerbuilder /usr/local/srv/yarn.lock /usr/local/srv/package*.json ./
RUN yarn install
COPY ./tree-viewer/public ./public
COPY --from=treeViewerbuilder /usr/local/srv/dist ./dist

CMD yarn start