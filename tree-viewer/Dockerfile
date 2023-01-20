FROM node:16
ENV PLATFORM="docker"
#ENV NODE_ENV="production"

WORKDIR /usr/topic-viewer
COPY ./topic-viewer/package*.json ./
COPY ./topic-viewer/tsconfig.json ./
RUN npm install
ADD ./topic-viewer/src ./src/.
ADD ./topic-viewer/public ./public/.
RUN npm run build

CMD npm start
