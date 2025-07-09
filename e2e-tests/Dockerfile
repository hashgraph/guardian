FROM cypress/included:14.5.1
WORKDIR /e2e

COPY --link package.json package-lock.json ./
RUN npm ci

COPY --link . .

ENTRYPOINT ["npx", "cypress", "run"]
CMD ["--config-file", "cypress.config.js"]