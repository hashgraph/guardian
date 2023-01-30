FROM node:16 AS interfacesModuleBuilder
WORKDIR /usr/local/interfaces
COPY ./interfaces/package*.json ./
COPY ./interfaces/tsconfig.json ./
ADD ./interfaces/src ./src/.
RUN npm install
RUN npm pack

FROM node:16 AS commonModuleBuilder
WORKDIR /usr/local/common
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz ./
COPY ./common/package*.json ./
COPY ./common/tsconfig.json ./
RUN npm install guardian-interfaces-*.tgz
ADD ./common/src ./src/.
RUN npm pack

FROM node:16 AS workerServiceBuilder
WORKDIR /usr/local/worker-service
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz ./
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz ./
COPY ./worker-service/package*.json ./
COPY ./worker-service/tsconfig.json ./
RUN npm install guardian-interfaces-*.tgz guardian-common-*.tgz
ADD ./worker-service/src ./src/.
RUN npm run build

FROM node:16
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/worker-service
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz ./
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz ./
COPY ./worker-service/package*.json ./
COPY ./worker-service/.env.docker ./.env
RUN npm install --production guardian-interfaces-*.tgz guardian-common-*.tgz
COPY --from=workerServiceBuilder /usr/local/worker-service/dist ./dist
RUN rm guardian-*.tgz

CMD npm start
