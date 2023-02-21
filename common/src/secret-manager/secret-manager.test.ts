import * as dotenv from 'dotenv';
import * as path from 'path';
import { SecretManager } from './secret-manager';
import { SecretManagerBase } from './secret-manager-base';

const authEnvPath = path.join(process.cwd(), '../auth-service/.env')
const guardianEnvPath = path.join(process.cwd(), '../guardian-service/.env')
const policyEnvPath = path.join(process.cwd(), '../policy-service/.env')
const workerEnvPath = path.join(process.cwd(), '../worker-service/.env')

const authCertsPath = path.join('../auth-service/tls/vault/client')
const guardianCertsPath = path.join('../guardian-service/tls/vault/client')
const policyCertsPath = path.join('../policy-service/tls/vault/client')
const workerCertsPath = path.join('../worker-service/tls/vault/client')

let secretManager: SecretManagerBase;

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
 * Test get Auth Service Secretkey from Vault by Auth Service
 */
async function test_secretkey() {
  setVaultCommonConfig()

  console.log('Test Auth Secretkey')

  dotenv.config({path: authEnvPath, override: true})
  setCertsPath(authCertsPath)

  secretManager = SecretManager.New()
  const data = await secretManager.getSecrets('secretkey/auth')
  console.log(data)
}

/**
 * Test get IPFS API KEY from Vault by Worker Service
 */
async function test_apikey_ipfs() {

  console.log('Test IPFS API KEY')

  dotenv.config({path: workerEnvPath, override: true})
  setCertsPath(workerCertsPath)

  secretManager = SecretManager.New()
  const data = await secretManager.getSecrets('apikey/ipfs')
  console.log(data)
}

/**
 * Test get Operator Key/ID from Vault by Guardian Service
 */
async function test_operator_key_guardian() {

  console.log('Test OPERATOR KEY/ID by Guardian')

  dotenv.config({path: guardianEnvPath, override: true})
  setCertsPath(guardianCertsPath)

  secretManager = SecretManager.New()
  const data = await secretManager.getSecrets('keys/operator')
  console.log(data)
}

/**
 * Test get Operator Key/ID from Vault by Policy Service
 */
async function test_operator_key_policy() {

  console.log('Test OPERATOR KEY/ID by Policy Service')

  dotenv.config({path: policyEnvPath, override: true})
  setCertsPath(policyCertsPath)

  secretManager = SecretManager.New()
  const data = await secretManager.getSecrets('keys/operator')
  console.log(data)
}

/**
 * Test get Operator Key/ID from Vault by Guardian Service
 */
async function test_wallet_guardian() {

  console.log('Test Wallet by Guardian Service')

  dotenv.config({path: guardianEnvPath, override: true})
  setCertsPath(guardianCertsPath)

  secretManager = SecretManager.New()
  await secretManager.setSecrets('wallet/test_guardian', {
    private_key: '0x1234567890abcdef',
  })

  const data = await secretManager.getSecrets('wallet/test_guardian')
  console.log(data)
}

/**
 * Test get Operator Key/ID from Vault by Policy Service
 */
async function test_wallet_policy() {

  console.log('Test Wallet by Policy Service')

  dotenv.config({path: policyEnvPath, override: true})
  setCertsPath(policyCertsPath)

  secretManager = SecretManager.New()
  await secretManager.setSecrets('wallet/test_policy', {
    private_key: '0xABCDEF0987654321',
  })

  const data = await secretManager.getSecrets('wallet/test_policy')
  console.log(data)
}

/**
 * Test Secret Manager
 */
async function test_secretmanager() {
  await test_secretkey()

  await test_apikey_ipfs()

  await test_operator_key_guardian()

  await test_operator_key_policy()

  await test_wallet_guardian()

  await test_wallet_policy()
}

test_secretmanager()