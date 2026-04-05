# ---- Builder Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install

COPY src ./src
COPY tsconfig.json nest-cli.json ./

RUN yarn build

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3030

CMD ["node", "dist/api/main.js"]
