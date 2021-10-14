FROM node:16
ENV PLATFORM="docker"
#ENV NODE_ENV="production"

WORKDIR /usr/message-broker
COPY ./message-broker/package*.json ./
COPY ./message-broker/tsconfig.json ./
RUN npm install
ADD ./message-broker/src ./src/.
RUN npm run build

CMD npm start
