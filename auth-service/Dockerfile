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

# Stage 3: Build authentication service
FROM node:${NODE_VERSION} AS authServiceBuilder
WORKDIR /usr/local/srv
COPY --from=interfacesBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY ./auth-service/package.json ./auth-service/tsconfig*.json ./auth-service/Gulpfile.js ./yarn.lock ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
COPY ./auth-service/environments ./environments/.
COPY ./auth-service/src ./src/.
RUN yarn install && yarn run build:prod

# Stage 4: Create the final image
FROM node:${NODE_VERSION}
ENV PLATFORM="docker" NODE_ENV="production"
WORKDIR /usr/local/auth-service
COPY --from=interfacesBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY --from=authServiceBuilder /usr/local/srv/yarn.lock /usr/local/srv/package*.json ./
RUN yarn install && rm /tmp/interfaces.tgz /tmp/common.tgz
COPY --from=authServiceBuilder /usr/local/srv/dist ./dist

CMD yarn start