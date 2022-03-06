FROM node:16
ENV PLATFORM="docker"
#ENV NODE_ENV="production"

WORKDIR /usr/interfaces
COPY ./interfaces/package*.json ./
COPY ./interfaces/tsconfig.json ./
RUN npm install
ADD ./interfaces/src ./src/.
RUN npm run build

WORKDIR /usr/auth-service
COPY ./auth-service/package*.json ./
COPY ./auth-service/tsconfig.json ./
COPY ./auth-service/.env.docker ./.env
RUN npm install
ADD ./auth-service/src ./src/.
RUN npm run build

CMD npm start
