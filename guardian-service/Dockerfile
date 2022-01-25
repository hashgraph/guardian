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

WORKDIR /usr/guardian-service
COPY ./guardian-service/package.json ./
RUN npm install
COPY ./guardian-service/tsconfig.json ./
COPY ./guardian-service/config.json ./
COPY ./guardian-service/.env.docker ./.env
ADD ./guardian-service/src ./src/.
RUN npm run build

CMD npm start
