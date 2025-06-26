FROM cypress/included:13.17.0
WORKDIR /e2e

COPY --link package.json package-lock.json ./
RUN npm ci

COPY --link . .

ENTRYPOINT ["npx", "cypress", "run"]
CMD ["--config-file", "cypress.config.js"]