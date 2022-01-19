# For local development

## Bootstrap (run once only)

```sh
# Use node version in .nvmrc
nvm use

# Run this once the first time (slow)
npm i

# Prevent race condition when trying to install `concurrently`
npx -y concurrently --help

# Create logs folder
mkdir -p .tmp/logs

# Run build once to prevent initial errors from `npm run dev:watch`
npm run build
```

## Get Started

```sh
# 1. Use node version in .nvmrc
nvm use

# 2. Run this afterward instead of `npm install` (faster)
npm run bootstrap

# 3a. Start dev servers without docker, watch for file changes
CLIENT_NAME=cohort npm run dev:watch 2>&1 | tee .tmp/logs/$(date "+%Y-%m-%dT%H-%M-%S").out

# 3b. Start dev servers with docker, does not watch for file changes
CLIENT_NAME=cohort npm run dev:docker

# 4. Initialize root config, installers, tokens, schemas and policies
CLIENT_NAME=cohort npm run tools init
```

# For production

Once Guardian is in production we can replace schemas and tokens, the best strategy is to create new schemas with new UUID, and new tokens with new token symbol, then create policy that point to those new schemas and tokens.
