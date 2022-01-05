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

WORKDIR /usr/frontend
COPY ./frontend/package*.json ./
COPY ./frontend/tsconfig.json ./
COPY ./frontend/tsconfig.app.json ./
RUN npm install
COPY ./frontend/angular.json ./
COPY ./frontend/index.html ./
ADD ./frontend/src ./src/.
RUN npm run build:deploy

WORKDIR /usr/ui-service
COPY ./ui-service/package*.json ./
RUN npm install
COPY ./ui-service/tsconfig.json ./
COPY ./ui-service/.env.docker ./.env
ADD ./ui-service/api ./api/.
ADD ./ui-service/src ./src/.
RUN npm run build

CMD npm start
