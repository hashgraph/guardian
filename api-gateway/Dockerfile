FROM node:16
ENV PLATFORM="docker"
#ENV NODE_ENV="production"

WORKDIR /usr/vc-modules
COPY ./vc-modules/package*.json ./
COPY ./vc-modules/tsconfig.json ./
RUN npm install
ADD ./vc-modules/src ./src/.
RUN npm run build

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

WORKDIR /usr/api-gateway
COPY ./api-gateway/package*.json ./
COPY ./api-gateway/tsconfig.json ./
COPY ./api-gateway/.env.docker ./.env
RUN npm install
ADD ./api-gateway/src ./src/.
RUN npm run build

CMD npm start
