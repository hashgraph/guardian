FROM node:16 AS interfacesModuleBuilder
WORKDIR /usr/local/interfaces
COPY ./interfaces/package.json ./
COPY ./interfaces/tsconfig*.json ./
ADD ./interfaces/src ./src/.
RUN yarn install
RUN yarn pack

FROM node:16 AS commonModuleBuilder
WORKDIR /usr/local/common
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY ./common/package.json ./
COPY ./common/tsconfig*.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
ADD ./common/src ./src/.
RUN yarn pack

FROM node:16 AS workerServiceBuilder
WORKDIR /usr/local/worker-service
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY ./worker-service/package.json ./
COPY ./worker-service/tsconfig*.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
ADD ./worker-service/src ./src/.
RUN yarn run build:prod

FROM node:16
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/worker-service
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY --from=workerServiceBuilder  /usr/local/worker-service/yarn.lock ./
COPY ./worker-service/package.json ./
RUN mkdir -p ./configs
COPY ./worker-service/configs/* ./configs
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install --frozen-lockfile
COPY --from=workerServiceBuilder /usr/local/worker-service/dist ./dist
RUN rm /tmp/interfaces.tgz /tmp/common.tgz

CMD yarn start
