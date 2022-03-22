FROM node:16
ENV PLATFORM="docker"
#ENV NODE_ENV="production"

WORKDIR /usr/interfaces
COPY ./interfaces/package*.json ./
COPY ./interfaces/tsconfig.json ./
RUN npm install
ADD ./interfaces/src ./src/.
RUN npm run build

WORKDIR /usr/logger-helper
COPY ./logger-helper/package*.json ./
COPY ./logger-helper/tsconfig.json ./
RUN npm install
ADD ./logger-helper/src ./src/.
RUN npm run build

WORKDIR /usr/ipfs-client
COPY ./ipfs-client/package*.json ./
COPY ./ipfs-client/tsconfig.json ./
COPY ./ipfs-client/.env.docker ./.env
RUN npm install
ADD ./ipfs-client/src ./src/.
RUN npm run build

CMD npm start
