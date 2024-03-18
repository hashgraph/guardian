ARG NODE_VERSION=20.11.1-bookworm-slim

# Stage 1: Build interfaces module
FROM node:${NODE_VERSION} AS interfacesBuilder
WORKDIR /usr/local/interfaces
COPY ./interfaces/package.json ./interfaces/tsconfig*.json ./yarn.lock ./package-lock.json ./
COPY ./interfaces/src ./src/.
RUN yarn install && yarn pack

# Stage 2: Build common module
FROM node:${NODE_VERSION} AS commonBuilder
WORKDIR /usr/local/common
COPY --from=interfacesBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY ./common/package.json ./common/tsconfig*.json ./yarn.lock ./package-lock.json ./
COPY ./common/src ./src/.
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install && yarn pack

# Stage 3: Build guardian service
FROM node:${NODE_VERSION} AS guardianServiceBuilder
WORKDIR /usr/local/srv
COPY --from=interfacesBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY ./guardian-service/package.json ./guardian-service/tsconfig*.json ./yarn.lock ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
COPY ./guardian-service/src ./src/.
RUN yarn install && yarn run build:prod

FROM node:${NODE_VERSION}
ENV PLATFORM="docker" NODE_ENV="production"
WORKDIR /usr/local/guardian-service
COPY --from=interfacesBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY --from=guardianServiceBuilder /usr/local/srv/yarn.lock /usr/local/srv/package*.json ./
COPY ./guardian-service/src/migrations/artifacts ./src/migrations/artifacts/.
COPY ./guardian-service/system-schemas ./system-schemas/.
COPY ./guardian-service/artifacts ./artifacts/.
RUN yarn install && rm /tmp/interfaces.tgz /tmp/common.tgz
COPY --from=guardianServiceBuilder /usr/local/srv/dist ./dist

CMD yarn start
