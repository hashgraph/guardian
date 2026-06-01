# Deployment Guide

This guide covers deploying the MECD Indexer dashboard to various hosting platforms.

## Prerequisites

- Node.js 20+
- A **Guardian Indexer API token** (Bearer JWT)
- The Guardian Indexer API must be accessible from your deployment environment

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `INDEXER_API_URL` | Yes | Guardian Indexer API base URL (e.g., `https://indexer.guardianservice.app/api/v1/testnet`) |
| `INDEXER_API_TOKEN` | Yes | Bearer JWT for the Guardian Indexer API. **Server-side only** — never expose to client. |
| `NEXT_PUBLIC_POLICY_HEDERA_ID` | Yes | Hedera topic ID for the policy (e.g., `1767599197.624837133`) |
| `NEXT_PUBLIC_POLICY_MONGO_ID` | No | MongoDB ID for the policy (not currently used in queries) |
| `NEXT_PUBLIC_HEDERA_NETWORK` | Yes | `testnet` or `mainnet` — used for Hedera explorer links |

**Important:** `INDEXER_API_TOKEN` and `INDEXER_API_URL` are server-side only. They are used by the auth proxy route (`app/api/proxy/[...path]/route.ts`) and must never be prefixed with `NEXT_PUBLIC_`.

## Option 1: Vercel (Recommended)

Vercel is the native hosting platform for Next.js.

### Steps

1. Push your code to GitHub/GitLab/Bitbucket

2. Import the repository on [vercel.com/new](https://vercel.com/new)

3. Add environment variables in the Vercel dashboard:
   - Go to **Settings > Environment Variables**
   - Add all variables from the table above
   - Ensure `INDEXER_API_TOKEN` and `INDEXER_API_URL` are **not** exposed to the client (Vercel handles this automatically for non-`NEXT_PUBLIC_` vars)

4. Deploy — Vercel auto-detects Next.js and configures the build

### Vercel-Specific Notes

- The auth proxy route runs as a Vercel Serverless Function
- Server-side caching (`next: { revalidate: 600 }`) works with Vercel's ISR
- `Cache-Control: s-maxage=600, stale-while-revalidate=3600` is respected by Vercel's CDN

## Option 2: Docker

### Dockerfile

Create a `Dockerfile` in the project root:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

For standalone output, add to `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: "standalone",
};
```

### Build and Run

```bash
docker build -t mecd-indexer .
docker run -p 3000:3000 \
  -e INDEXER_API_URL=https://indexer.guardianservice.app/api/v1/testnet \
  -e INDEXER_API_TOKEN=your_token_here \
  -e NEXT_PUBLIC_POLICY_HEDERA_ID=1767599197.624837133 \
  -e NEXT_PUBLIC_HEDERA_NETWORK=testnet \
  mecd-indexer
```

## Option 3: Node.js Server

Build and run directly with Node.js:

```bash
npm install
npm run build
npm start
```

The app starts on port 3000 by default. Set `PORT` env var to change it.

### With PM2 (Process Manager)

```bash
npm install -g pm2
npm run build
pm2 start npm --name "mecd-indexer" -- start
pm2 save
pm2 startup  # Auto-start on reboot
```

### Behind Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Option 4: Cloudflare Pages

Next.js on Cloudflare Pages requires the `@cloudflare/next-on-pages` adapter.

1. Install: `npm install @cloudflare/next-on-pages`
2. Add to `package.json` scripts: `"pages:build": "npx @cloudflare/next-on-pages"`
3. Deploy via Cloudflare dashboard or Wrangler CLI
4. Add environment variables in the Cloudflare dashboard

**Note:** Cloudflare Pages has [some limitations](https://developers.cloudflare.com/pages/framework-guides/nextjs/) with Next.js features. The auth proxy route should work as an Edge Function, but test thoroughly.

## Option 5: AWS (Amplify or EC2)

### AWS Amplify

1. Connect your GitHub repo in the [Amplify Console](https://console.aws.amazon.com/amplify/)
2. Amplify auto-detects Next.js
3. Add environment variables in **App settings > Environment variables**
4. Deploy

### AWS EC2

Use the Node.js Server approach (Option 3) on an EC2 instance with PM2 and Nginx.

## Connecting to a Different Guardian Indexer

To point the dashboard at a different Guardian Indexer instance or policy:

1. **Change the API URL:** Set `INDEXER_API_URL` to your Guardian Indexer's base URL (e.g., `https://your-indexer.example.com/api/v1/testnet`)

2. **Get an API token:** Obtain a Bearer JWT from your Guardian Indexer instance

3. **Find your policy's Hedera topic ID:** This is the `analytics.policyId` value in your policy's VC documents. You can find it on [HashScan](https://hashscan.io/) by looking at your policy's Hedera Consensus Service topic.

4. **Set the network:** `testnet` or `mainnet` depending on where your Guardian instance runs

5. **Entity types:** The current dashboard supports the MECD 431 entity types. If your policy uses different entity types, you'll need to update `lib/utils/trust-chain.ts` (entity type config) and add VC renderers in `components/vc-views/`.

## Monitoring and Health Checks

The app exposes no dedicated health endpoint, but you can check:

- **`GET /`** — returns 200 if the app is running (redirects to `/dashboard`)
- **`GET /api/proxy/entities/vc-documents?pageSize=1`** — returns 200 if the API proxy and Guardian Indexer connection are working

## Troubleshooting

| Problem | Solution |
|---|---|
| Blank page, no data | Check `INDEXER_API_TOKEN` is set and valid (JWTs expire) |
| API proxy returns 401 | Token expired — get a new JWT from the Guardian Indexer |
| API proxy returns 500 | Check `INDEXER_API_URL` is correct and the Guardian Indexer is reachable |
| Build fails with type errors | Run `npm install` first, ensure Node.js 20+ |
| `NEXT_PUBLIC_` vars not working | These are baked in at build time — rebuild after changing them |
