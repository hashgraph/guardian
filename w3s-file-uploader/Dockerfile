FROM node:18 AS interfacesModuleBuilder
WORKDIR /usr/local/interfaces
COPY ./interfaces/package.json ./
COPY ./interfaces/tsconfig*.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
ADD ./interfaces/src ./src/.
RUN yarn install
RUN yarn pack

FROM node:18 AS commonModuleBuilder
WORKDIR /usr/local/common
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY ./common/package.json ./
COPY ./common/tsconfig*.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
ADD ./common/src ./src/.
RUN yarn pack

FROM node:18 AS w3sFileUploaderServiceBuilder
WORKDIR /usr/local/w3s-file-uploader
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY ./w3s-file-uploader/package.json ./
COPY ./w3s-file-uploader/tsconfig*.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
ADD ./w3s-file-uploader/src ./src/.
RUN yarn run build:prod

FROM node:18
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/w3s-file-uploader
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY --from=w3sFileUploaderServiceBuilder  /usr/local/w3s-file-uploader/yarn.lock ./
COPY ./w3s-file-uploader/package.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
COPY --from=w3sFileUploaderServiceBuilder /usr/local/w3s-file-uploader/dist ./dist
RUN rm /tmp/interfaces.tgz /tmp/common.tgz

CMD yarn start
