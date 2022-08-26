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

WORKDIR /usr/worker-service
COPY ./ipfs-client/package*.json ./
COPY ./ipfs-client/tsconfig.json ./
COPY ./ipfs-client/.env ./.env
RUN npm install --force /usr/interfaces/guardian-interfaces-*.tgz /usr/common/guardian-common-*.tgz
RUN npm install --force
ADD ./ipfs-client/src ./src/.
RUN npm run build

CMD npm start
