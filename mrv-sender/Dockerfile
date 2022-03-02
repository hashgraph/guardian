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

WORKDIR /usr/mrv-sender
COPY ./mrv-sender/package.json ./
RUN npm install
COPY ./mrv-sender/tsconfig.json ./
ADD ./mrv-sender/src ./src/.
ADD ./mrv-sender/public ./public/.
RUN npm run build

CMD npm start
