FROM node:16 AS interfacesModuleBuilder
WORKDIR /usr/local/interfaces
COPY ./interfaces/package.json ./
COPY ./interfaces/tsconfig*.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
ADD ./interfaces/src ./src/.
RUN yarn install
RUN yarn pack

FROM node:16 AS commonModuleBuilder
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

FROM node:16 AS projectcomparsionbuilder
WORKDIR /usr/local/projectComparsion
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY ./project-comparison/package.json ./
COPY ./project-comparison/tsconfig*.json ./
COPY ./project-comparison/angular.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install
ADD ./project-comparison/src ./src/.
ADD ./project-comparison/mocks ./mocks/.
RUN yarn run build

FROM nginx:latest AS final
WORKDIR /usr/share/nginx/html
COPY --from=projectcomparsionbuilder /usr/local/projectComparsion/dist/project-comparison/ ./
#COPY --from=projectcomparsionbuilder /usr/local/projectComparsion/dist/project-comparison/assets/ ./assets/

EXPOSE 4200
CMD ["nginx", "-g", "daemon off;"]
