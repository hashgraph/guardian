# For local development

```sh
# 1. Use latest Node.js
nvm use

# 2a. First time
npm i

# 2b. Other times
npm run bootstrap

# 3a. start dev servers without docker, watch for file changes
mkdir -p .tmp/logs
npm run dev:watch 2>&1 | tee .tmp/logs/$(date "+%Y-%m-%dT%H-%M-%S").out

# 3b. start dev servers with docker, does not watch for file changes
npm run dev:docker

# 4. Initialize Guardian (manual)
#
# - Open http://localhost:3002
# - Login as RootAuthority
# - Complete the configuration

# 5. Initialize schemas
npm run tools init-schemas

# 6. Initialize tokens
npm run tools init-tokens
```

# For production

Once Guardian is in production we can replace schemas and tokens, the best strategy is to create new schemas with new UUID, and new tokens with new token symbol, then create policy that point to those new schemas and tokens.
