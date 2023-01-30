FROM node:16 as treeViewerbuilder
WORKDIR /usr/local/tree-viewer
COPY ./tree-viewer/package.json ./
COPY ./tree-viewer/tsconfig.json ./
RUN npm install
ADD ./tree-viewer/src ./src
RUN npm run build

FROM node:16
ENV PLATFORM="docker"
ENV NODE_ENV="production"
WORKDIR /usr/local/tree-viewer
COPY ./topic-viewer/package*.json ./
RUN npm install --production
COPY ./tree-viewer/public ./public
COPY --from=treeViewerbuilder /usr/local/tree-viewer/dist ./dist

CMD npm start
