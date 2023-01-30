FROM node:16 AS interfacesModuleBuilder
WORKDIR /usr/local/interfaces
COPY ./interfaces/package*.json ./
COPY ./interfaces/tsconfig.json ./
ADD ./interfaces/src ./src/.
RUN npm install
RUN npm pack

FROM node:16 as frontendBuilder
WORKDIR /usr/local/frontend
COPY ./frontend/. /usr/local/frontend
COPY --from=interfacesModuleBuilder /usr/local/interfaces/guardian-interfaces-*.tgz ./
RUN npm install guardian-interfaces-*.tgz
RUN npm run build

FROM nginx:latest
ENV PLATFORM="docker"
COPY ./web-proxy/configs/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontendBuilder /usr/local/frontend/dist/guardian /usr/share/nginx/html

EXPOSE 80
