FROM node:16 as topicViewerbuilder
WORKDIR /usr/local/topic-viewer
COPY ./topic-viewer/package.json ./
COPY ./topic-viewer/tsconfig*.json ./
RUN npm install
ADD ./topic-viewer/src ./src
RUN npm run build:prod

FROM node:16
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/topic-viewer
COPY ./topic-viewer/package*.json ./
RUN npm install --production
COPY ./topic-viewer/public ./public
COPY --from=topicViewerbuilder /usr/local/topic-viewer/dist ./dist

CMD npm start
