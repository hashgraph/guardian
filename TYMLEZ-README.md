# For local development

```sh
nvm use

npm i

# without docker, watch for file changes
mkdir -p .tmp/
npm run dev:watch 2>&1 | tee .tmp/$(date "+%Y-%m-%dT%H-%M-%S").out

# with docker, does not watch for file changes
npm run dev:docker
```
