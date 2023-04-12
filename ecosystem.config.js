function readEnvFile(filePath) {
  const fs = require('fs');
  const path = require('path');
  const envFile = path.resolve(__dirname, filePath);
  return fs
  .readFileSync(envFile, { encoding: 'utf8' })
  .split('\n')
  .reduce((acc, line) => {
    if (!line) return acc;

    const parts = line.split('#');
    const [keyValue] = parts;

    if (!keyValue) return acc;

    const [key, value] = keyValue.split('=');
    return { ...acc, [key]: value.trim().replace(/^("|')|("|')$/g, '') };
  }, {});

}

console.log(readEnvFile('./worker-service/.env'));

const appEnv = readEnvFile('.env');

module.exports = {
  apps : [{
    name: 'logger',
    script: 'npm run start',
    cwd: './logger-service/dist',
    env: {
      ...readEnvFile('./logger-service/.env')
    }
  },
  {
    name: 'gateway',
    script: 'npm run start',
    cwd: './api-gateway/dist',
    env: {
      ...readEnvFile('./api-gateway/.env')
    }
  },
  {
    name: 'auth',
    script: 'npm run start',
    cwd: './auth-service/dist',
    env: {
      SECRET_MANAGER: appEnv.SECRET_MANAGER,
      ...readEnvFile('./auth-service/.env')
    }
  },
  {
    name: 'guardian',
    script: 'npm run start',
    cwd: './guardian-service/dist',
    env: {
      SECRET_MANAGER: appEnv.SECRET_MANAGER,
      ...readEnvFile('./guardian-service/.env')
    }
  },
  {
    name: 'policy',
    script: 'npm run start',
    cwd: './policy-service/dist',
    env: {
      SECRET_MANAGER: appEnv.SECRET_MANAGER,
      ...readEnvFile('./policy-service/.env')
    }
  },
  {
    name: 'worker',
    script: 'npm run start',
    cwd: './worker-service/dist',
    env: {
      SECRET_MANAGER: appEnv.SECRET_MANAGER,
      ...readEnvFile('./worker-service/.env')
    }
  },
  {
    name: 'topic',
    script: 'npm run start',
    cwd: './topic-viewer/dist',
  },
  {
    name: 'mrv',
    script: 'npm run start',
    cwd: './mrv-sender/dist',
  },
  {
    name: 'frontend',
    script: 'npm run start',
    cwd: './frontend/dist',
  }]
};