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

WORKDIR /usr/policy-service
COPY ./policy-service/package*.json ./
COPY ./policy-service/tsconfig.json ./
COPY ./policy-service/.env.docker ./.env
RUN npm install --force /usr/interfaces/guardian-interfaces-*.tgz /usr/common/guardian-common-*.tgz
RUN npm install --force
ADD ./policy-service/src ./src/.
RUN npm run build

CMD npm start
