# =============================================================================
# Sustainable Explorer Frontend — Nuxt 3 SSR
# =============================================================================
#
# Multi-stage build:
#   1. deps     - install node_modules with a cacheable layer
#   2. builder  - build the Nuxt production output (.output/)
#   3. runner   - minimal runtime image serving the built Nitro server
# =============================================================================

# ---- 1. Deps ----
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install


# ---- 2. Builder ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Nuxt expects NODE_ENV at build time for production optimizations
ENV NODE_ENV=production

RUN yarn nuxt prepare && yarn build

# ---- 3. Runner ----
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -S nuxt && adduser -S nuxt -G nuxt

# Copy only the built output — nothing else is needed for Nitro to run
COPY --from=builder --chown=nuxt:nuxt /app/.output ./.output

ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

USER nuxt

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
