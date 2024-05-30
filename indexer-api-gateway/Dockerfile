FROM node:20 AS interfacesModuleBuilder
WORKDIR /usr/local/indexer-interfaces
COPY ./indexer-interfaces/package.json ./
COPY ./indexer-interfaces/tsconfig*.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
ADD ./indexer-interfaces/src ./src/.
RUN yarn install
RUN yarn pack

FROM node:20 AS commonModuleBuilder
WORKDIR /usr/local/indexer-common
COPY --from=interfacesModuleBuilder /usr/local/indexer-interfaces/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY ./indexer-common/package.json ./
COPY ./indexer-common/tsconfig*.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/interfaces']='file:/tmp/indexer-interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
ADD ./indexer-common/src ./src/.
RUN yarn pack

FROM node:20 AS apiGatewayBuilder
WORKDIR /usr/local/indexer-api-gateway
COPY --from=interfacesModuleBuilder /usr/local/indexer-interfaces/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/indexer-common/indexer-common-*.tgz /tmp/indexer-common.tgz
COPY ./indexer-api-gateway/package.json ./
COPY ./indexer-api-gateway/tsconfig*.json ./
COPY ./indexer-api-gateway/Gulpfile.mjs ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/interfaces']='file:/tmp/indexer-interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/common']='file:/tmp/indexer-common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
ADD ./indexer-api-gateway/environments ./environments/.
ADD ./indexer-api-gateway/src ./src/.
RUN yarn run build:prod

FROM node:20
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/indexer-api-gateway
COPY --from=interfacesModuleBuilder /usr/local/indexer-interfaces/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/indexer-common/indexer-common-*.tgz /tmp/indexer-common.tgz
COPY --from=apiGatewayBuilder  /usr/local/indexer-api-gateway/yarn.lock ./
COPY ./indexer-api-gateway/package.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/interfaces']='file:/tmp/indexer-interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/common']='file:/tmp/indexer-common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
COPY --from=apiGatewayBuilder /usr/local/indexer-api-gateway/dist ./dist
RUN rm /tmp/indexer-interfaces.tgz /tmp/indexer-common.tgz

CMD npm start
