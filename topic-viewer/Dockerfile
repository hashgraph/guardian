# Stage 1: Build topic viewer service
FROM node:20 as topicViewerbuilder
WORKDIR /usr/local/srv
COPY ./topic-viewer/package.json ./topic-viewer/tsconfig*.json ./yarn.lock ./package-lock.json ./
COPY ./topic-viewer/src ./src
RUN yarn install && yarn run build:prod

# Stage 2: Create the final image
FROM node:20
ENV PLATFORM="docker" NODE_ENV="production"
WORKDIR /usr/local/topic-viewer
COPY --from=topicViewerbuilder /usr/local/srv/yarn.lock /usr/local/srv/package*.json ./
RUN yarn install
COPY ./topic-viewer/public ./public
COPY --from=topicViewerbuilder /usr/local/srv/dist ./dist

CMD yarn start