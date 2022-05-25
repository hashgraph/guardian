FROM node:16
ENV PLATFORM="docker"
#ENV NODE_ENV="production"

WORKDIR /usr/interfaces
COPY ./interfaces/package*.json ./
COPY ./interfaces/tsconfig.json ./
ADD ./interfaces/src ./src/.
RUN npm install
RUN npm pack

WORKDIR /usr/common
COPY ./common/package*.json ./
COPY ./common/tsconfig.json ./
ADD ./common/src ./src/.
RUN npm install /usr/interfaces/guardian-interfaces-*.tgz
RUN npm install
RUN npm pack

WORKDIR /usr/logger-helper
COPY ./logger-helper/package*.json ./
COPY ./logger-helper/tsconfig.json ./
ADD ./logger-helper/src ./src/.
RUN npm install /usr/interfaces/guardian-interfaces-*.tgz /usr/common/guardian-common-*.tgz
RUN npm install
RUN npm pack

WORKDIR /usr/auth-service
COPY ./auth-service/package*.json ./
COPY ./auth-service/tsconfig.json ./
COPY ./auth-service/.env.docker ./.env
RUN npm install /usr/interfaces/guardian-interfaces-*.tgz /usr/common/guardian-common-*.tgz /usr/logger-helper/guardian-logger-helper-*.tgz
RUN npm install
ADD ./auth-service/src ./src/.
RUN npm run build

CMD npm start
