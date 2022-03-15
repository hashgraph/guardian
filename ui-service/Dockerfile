FROM node:16
ENV PLATFORM="docker"
#ENV NODE_ENV="production"

WORKDIR /usr/vc-modules
COPY ./vc-modules/package.json ./
RUN npm install
COPY ./vc-modules/tsconfig.json ./
ADD ./vc-modules/src ./src/.
RUN npm run build

WORKDIR /usr/interfaces
COPY ./interfaces/package.json ./
RUN npm install
COPY ./interfaces/tsconfig.json ./
ADD ./interfaces/src ./src/.
RUN npm run build

WORKDIR /usr/frontend
COPY ./frontend/package.json ./
RUN npm install
COPY ./frontend/tsconfig.json ./
COPY ./frontend/tsconfig.app.json ./
COPY ./frontend/angular.json ./
COPY ./frontend/index.html ./
ADD ./frontend/src ./src/.
RUN npm run build:deploy

WORKDIR /usr/ui-service
COPY ./ui-service/package.json ./
RUN npm install
COPY ./ui-service/tsconfig.json ./
COPY ./ui-service/.env.docker ./.env
ADD ./ui-service/api ./api/.
ADD ./ui-service/src ./src/.
RUN npm run build

CMD npm start
