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

WORKDIR /usr/mrv-sender
COPY ./mrv-sender/package*.json ./
COPY ./mrv-sender/tsconfig.json ./
RUN npm install
ADD ./mrv-sender/src ./src/.
ADD ./mrv-sender/public ./public/.
RUN npm run build

CMD npm start
