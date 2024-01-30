FROM node:20 AS interfacesModuleBuilder
WORKDIR /usr/local/interfaces
COPY ./interfaces/package.json ./
COPY ./interfaces/tsconfig*.json ./
COPY ./yarn.lock ./
COPY ./package-lock.json ./
ADD ./interfaces/src ./src/.
RUN yarn install
RUN yarn pack

FROM node:20 as frontendBuilder
ENV NODE_OPTIONS="--openssl-legacy-provider"
WORKDIR /usr/local/frontend
COPY ./frontend/. /usr/local/frontend
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz /tmp/interfaces.tgz
RUN node -e "const fs=require('fs'); const input=JSON.parse(fs.readFileSync('package.json')); input.dependencies['@guardian/interfaces']='file:/tmp/interfaces.tgz'; fs.writeFileSync('package.json', JSON.stringify(input));"
RUN npm install
RUN npm run build

FROM nginx:1.25.1
ENV PLATFORM="docker"
COPY ./web-proxy/configs/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontendBuilder /usr/local/frontend/dist/guardian /usr/share/nginx/html

EXPOSE 80
