# Stage 1: Build interfaces module
FROM node:20.11.1-bookworm-slim AS interfacesModuleBuilder
WORKDIR /usr/local/interfaces
COPY ./interfaces/package.json ./interfaces/tsconfig*.json ./yarn.lock ./package-lock.json ./
COPY ./interfaces/src ./src/.
RUN yarn install && yarn pack

# Stage 2: Build common module
FROM node:20.11.1-bookworm-slim AS commonModuleBuilder
WORKDIR /usr/local/common
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY ./common/package.json ./common/tsconfig*.json ./yarn.lock ./package-lock.json ./
COPY ./common/src ./src/.
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN yarn install && yarn pack

# Stage 3: Build analytics service
FROM node:20.11.1-bookworm-slim AS analyticsBuilder
WORKDIR /usr/local/srv
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY ./analytics-service/package.json ./analytics-service/tsconfig*.json ./yarn.lock ./package-lock.json ./
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; input.dependencies['@guardian/common']='file:/tmp/common.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
COPY ./analytics-service/src ./src/.
RUN yarn install && yarn run build:prod

# Stage 4: Create the final image
FROM node:20.11.1-bookworm-slim
ENV PLATFORM="docker" NODE_ENV="production"
WORKDIR /usr/local/analytics-service
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
COPY --from=commonModuleBuilder /usr/local/common/guardian-common-*.tgz /tmp/common.tgz
COPY --from=analyticsBuilder /usr/local/srv/yarn.lock /usr/local/srv/package*.json ./
COPY ./analytics-service/public ./public
RUN yarn install && rm /tmp/interfaces.tgz /tmp/common.tgz
COPY --from=analyticsBuilder /usr/local/srv/dist ./dist

CMD npm start