FROM node:16 as topicViewerbuilder
WORKDIR /usr/local/topic-viewer
COPY ./topic-viewer/package.json ./
COPY ./topic-viewer/tsconfig*.json ./
RUN yarn install
ADD ./topic-viewer/src ./src
RUN yarn run build:prod

FROM node:16
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/topic-viewer
COPY ./topic-viewer/package.json ./
COPY --from=topicViewerbuilder  /usr/local/topic-viewer/yarn.lock ./
RUN yarn install --frozen-lockfile
COPY ./topic-viewer/public ./public
COPY --from=topicViewerbuilder /usr/local/topic-viewer/dist ./dist

CMD yarn start
