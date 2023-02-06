FROM node:16 as apiDocsbuilder
WORKDIR /usr/local/api-docs
COPY ./api-docs/package.json ./
COPY ./api-docs/tsconfig*.json ./
COPY ./api-docs/tslint.json ./
RUN yarn install
ADD ./api-docs/src ./src
RUN yarn run build:prod

FROM node:16
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/api-docs
COPY --from=apiDocsbuilder  /usr/local/api-docs/yarn.lock ./
COPY ./api-docs/package.json ./
RUN yarn install --frozen-lockfile
COPY ./api-docs/api ./api
COPY --from=apiDocsbuilder /usr/local/api-docs/dist ./dist

CMD yarn start
