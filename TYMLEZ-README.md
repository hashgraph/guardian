# For local development

## Set up WEB_STORAGE_TOKEN

- Go to https://web3.storage/ and login/signup

- Follow instructions to create a new API token and copy to the clipboard

### locally

- add following line to your ~/.zshrc

```sh
export WEB3_STORAGE_TOKEN=<your-copy-paste-api-token-here>
```
- start a new terminal and go on.
### AWS 

? 

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
npm run dev:watch 2>&1 | tee .tmp/logs/$(date "+%Y-%m-%dT%H-%M-%S").out

# 3b. Start dev servers with docker, does not watch for file changes
npm run dev:docker

# 4. Initialize Guardian (manual)
#
# - Open http://localhost:3002
# - Login as RootAuthority
# - Complete the configuration

# 5. Initialize tokens, schemas and policies
npm run tools init-policies
```

# For production

Once Guardian is in production we can replace schemas and tokens, the best strategy is to create new schemas with new UUID, and new tokens with new token symbol, then create policy that point to those new schemas and tokens.
