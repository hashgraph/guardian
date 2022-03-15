FROM node:16 as frontendBuilder
WORKDIR /usr/local/interfaces
COPY ./interfaces/package*.json /usr/local/interfaces/
COPY ./interfaces/tsconfig.json /usr/local/interfaces/
RUN npm install
ADD ./interfaces/src/ /usr/local/interfaces/src/.
RUN npm run build
WORKDIR /usr/local/frontend
COPY ./frontend/. /usr/local/frontend
RUN npm install
RUN npm run build

FROM nginx:latest
ENV PLATFORM="docker"
COPY ./web-proxy/configs/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontendBuilder /usr/local/frontend/dist/guardian /usr/share/nginx/html

EXPOSE 80
