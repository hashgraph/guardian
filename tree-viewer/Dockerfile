FROM node:16 as treeViewerbuilder
WORKDIR /usr/local/tree-viewer
COPY ./tree-viewer/package.json ./
COPY ./tree-viewer/tsconfig*.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
RUN yarn install
ADD ./tree-viewer/src ./src
RUN yarn run build:prod

FROM node:16
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/tree-viewer
COPY ./topic-viewer/package.json ./
COPY --from=treeViewerbuilder  /usr/local/tree-viewer/yarn.lock ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
RUN yarn install
COPY ./tree-viewer/public ./public
COPY --from=treeViewerbuilder /usr/local/tree-viewer/dist ./dist

CMD yarn start
