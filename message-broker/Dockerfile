FROM node:16
ENV PLATFORM="docker"
#ENV NODE_ENV="production"

WORKDIR /usr/message-broker
COPY ./message-broker/package.json ./
RUN npm install
COPY ./message-broker/tsconfig.json ./
ADD ./message-broker/src ./src/.
RUN npm run build

CMD npm start
