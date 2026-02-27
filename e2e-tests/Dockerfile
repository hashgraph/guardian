FROM cypress/included:14.5.4
WORKDIR /e2e
ENV CYPRESS_INSTALL_BINARY=0

RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium curl \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY --link package.json package-lock.json ./
RUN npm ci

COPY --link . .

RUN chmod +x /e2e/entrypoint.sh

ENV CYPRESS_BROWSER=chromium

ENTRYPOINT ["/e2e/entrypoint.sh"]
CMD []
