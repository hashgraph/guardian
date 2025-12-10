FROM cypress/included:14.5.4
WORKDIR /e2e
ENV CYPRESS_INSTALL_BINARY=0

COPY --link package.json package-lock.json ./
RUN npm ci

COPY --link . .

ENTRYPOINT ["npx", "cypress", "run"]
CMD ["--config-file", "cypress.config.js"]