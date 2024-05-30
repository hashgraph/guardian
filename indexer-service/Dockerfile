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

FROM node:20 AS serviceBuilder
WORKDIR /usr/local/indexer-service
COPY --from=interfacesModuleBuilder /usr/local/indexer-interfaces/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/indexer-common/indexer-common-*.tgz /tmp/indexer-common.tgz
COPY ./indexer-service/package.json ./
COPY ./indexer-service/tsconfig*.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/interfaces']='file:/tmp/indexer-interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/common']='file:/tmp/indexer-common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
ADD ./indexer-service/src ./src/.
RUN yarn run build:prod

FROM node:20
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/indexer-service
COPY --from=interfacesModuleBuilder /usr/local/indexer-interfaces/indexer-interfaces-*.tgz /tmp/indexer-interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/indexer-common/indexer-common-*.tgz /tmp/indexer-common.tgz
COPY --from=serviceBuilder  /usr/local/indexer-service/yarn.lock ./
COPY ./indexer-service/package.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/interfaces']='file:/tmp/indexer-interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@indexer/common']='file:/tmp/indexer-common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
COPY --from=serviceBuilder /usr/local/indexer-service/dist ./dist
RUN rm /tmp/indexer-interfaces.tgz /tmp/indexer-common.tgz

CMD yarn start
