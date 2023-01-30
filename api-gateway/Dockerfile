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

FROM node:16 AS apiGatewayBuilder
WORKDIR /usr/local/api-gateway
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz ./
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz ./
COPY ./api-gateway/package*.json ./
COPY ./api-gateway/tsconfig.json ./
COPY ./api-gateway/.env.docker ./.env
RUN npm install guardian-interfaces-*.tgz guardian-common-*.tgz
ADD ./api-gateway/src ./src/.
RUN npm run build

FROM node:16
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/api-gateway
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz ./
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz ./
COPY ./api-gateway/package*.json ./
COPY ./api-gateway/.env.docker ./.env
RUN npm install --production guardian-interfaces-*.tgz guardian-common-*.tgz
COPY --from=apiGatewayBuilder /usr/local/api-gateway/dist ./dist
RUN rm guardian-*.tgz

CMD npm start
