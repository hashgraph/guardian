import { MikroORM } from '@mikro-orm/core';
import { MongoDriver } from '@mikro-orm/mongodb';
import { DataBaseHelper, DataBaseNamingStrategy } from '../../helpers';
import { WalletAccount } from './vault-account';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SecretManager } from '../secret-manager';
import { Wallet } from '../../wallet';
import { SecretManagerType } from '../secret-manager-config';
import { exit } from 'process';

const globalEnvPath = path.join(process.cwd(), '../.env')
// const authEnvPath = path.join(process.cwd(), '../auth-service/.env')
const guardianEnvPath = path.join(process.cwd(), '../guardian-service/.env')
const workerEnvPath = path.join(process.cwd(), '../worker-service/.env')

// const authCertsPath = path.join('../auth-service/tls/vault/client')
const guardianCertsPath = path.join('../guardian-service/tls/vault/client')
const workerCertsPath = path.join('../worker-service/tls/vault/client')

/**
 * Set common configs for Vault
 */
function setVaultCommonConfig() {
  process.env.VAULT_ADDRESS = 'https://localhost:8200'
  process.env.VAULT_API_VERSION = 'v1'
}

/**
 * Set Vault TLS options
 * @param certsPath
 */
function setCertsPath(certsPath: string) {
  process.env.VAULT_CA_CERT = `${certsPath}/ca.crt`
  process.env.VAULT_CLIENT_CERT = `${certsPath}/tls.crt`
  process.env.VAULT_CLIENT_KEY = `${certsPath}/tls.key`
}

/**
 * setAuthConfig
 */
// function setAuthConfig() {
//   dotenv.config({path: globalEnvPath, override: true})
//   if (process.env.SECRET_MANAGER === 'hcp') {
//     setVaultCommonConfig()
//     dotenv.config({path: authEnvPath, override: true})
//     setCertsPath(authCertsPath)
//   } else if (process.env.SECRET_MANAGER === 'aws') {
//     dotenv.config({path: globalEnvPath, override: true})
//   }
// }

/**
 * setWorkerConfig
 */
function setWorkerConfig() {
  dotenv.config({path: globalEnvPath, override: true})
  if (process.env.SECRET_MANAGER === 'hcp') {
    setVaultCommonConfig()
    dotenv.config({path: workerEnvPath, override: true})
    setCertsPath(workerCertsPath)
  } else if (process.env.SECRET_MANAGER === 'aws') {
    dotenv.config({path: globalEnvPath, override: true})
  }
}

/**
 * setGuardianConfig
 */
function setGuardianConfig() {
  dotenv.config({path: globalEnvPath, override: true})
  if (process.env.SECRET_MANAGER === 'hcp') {
    setVaultCommonConfig()
    dotenv.config({path: guardianEnvPath, override: true})
    setCertsPath(guardianCertsPath)
  } else if (process.env.SECRET_MANAGER === 'aws') {
    dotenv.config({path: globalEnvPath, override: true})
  }
}

/**
 * writeIpfsApiKey
 * @param apiKey
 */
async function writeIpfsApiKey(apiKey: string) {
  setWorkerConfig()
  const secretManager = SecretManager.New(process.env.SECRET_MANAGER as SecretManagerType)
  await secretManager.setSecrets('apikey/ipfs', { IPFS_STORAGE_API_KEY: apiKey })
}

/**
 * writeOperator
 * @param operatorId
 * @param operatorKey
 */
async function writeOperator(operatorId, operatorKey: string) {
  setGuardianConfig()
  const secretManager = SecretManager.New(process.env.SECRET_MANAGER as SecretManagerType)
  await secretManager.setSecrets('keys/operator', {
    OPERATOR_ID: operatorId,
    OPERATOR_KEY: operatorKey,
  })
}

/**
 * writeWallet
 * @param token
 * @param type
 * @param key
 * @param value
 */
async function writeWallet(token, type, key, value) {
  setGuardianConfig()
  const wallet = new Wallet(process.env.SECRET_MANAGER as SecretManagerType)
  await wallet.setKey(token, type, key, value)
}

/**
 * migrate
 */
async function migrate() {
  const db = await MikroORM.init<MongoDriver>({
    type: 'mongo',
    namingStrategy: DataBaseNamingStrategy,
    dbName: 'auth_db',
    clientUrl:`mongodb://localhost:27017`,
    entities: [
      'dist/secret-manager/migrations/vault-account.js'
    ],
    driverOptions: {
      useUnifiedTopology: true
    },
    ensureIndexes: true
  })

  DataBaseHelper.orm = db;
  const dbSecret = new DataBaseHelper(WalletAccount)

  // write IPFS API KEY to Vault
  const ipfsApiKey = await dbSecret.findOne({type: 'IPFS_STORAGE_API_KEY'})
  await writeIpfsApiKey(ipfsApiKey.key)

  // write Auth Service Secretkey to Vault
  // const authSecretKey = await dbSecret.find({type: 'AUTH_SERVICE_SECRET_KEY'})

  // write Operator to Vault
  const { key: operatorKey } = await dbSecret.findOne({type: 'OPERATOR_KEY'})
  const { key: operatorId } = await dbSecret.findOne({type: 'OPERATOR_ID'})
  await writeOperator(operatorId, operatorKey)

  // write Wallets to Vault
  const wallets = await dbSecret.findAll()
  for (const wallet of wallets) {
    if (wallet.token) {
      const [type, key] = wallet.type.split('|')
      await writeWallet(wallet.token, type, key, wallet.key)
    }
  }

  exit(0)
}

migrate()
