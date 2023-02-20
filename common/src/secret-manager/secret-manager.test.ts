import * as dotenv from 'dotenv';
import * as path from 'path';
import { SecretManager } from './secret-manager';
import { SecretManagerBase } from './secret-manager-base';

const auth_env_path = path.join(process.cwd(), '../auth-service/.env')
const guardian_env_path = path.join(process.cwd(), '../guardian-service/.env')
const policy_env_path = path.join(process.cwd(), '../policy-service/.env')
const worker_env_path = path.join(process.cwd(), '../worker-service/.env')

const auth_certs_path = path.join('../auth-service/tls/vault/client')
const guardian_certs_path = path.join('../guardian-service/tls/vault/client')
const policy_certs_path = path.join('../policy-service/tls/vault/client')
const worker_certs_path = path.join('../worker-service/tls/vault/client')

let secretManager: SecretManagerBase;

function setVaultCommonConfig() {
  process.env.VAULT_ADDRESS = 'https://localhost:8200'
  process.env.VAULT_API_VERSION = 'v1'
}

function setCertsPath(certsPath: string) {
  process.env.VAULT_CA_CERT = `${certsPath}/ca.crt`
  process.env.VAULT_CLIENT_CERT = `${certsPath}/tls.crt`
  process.env.VAULT_CLIENT_KEY = `${certsPath}/tls.key`
}

async function test_secretkey() {
  setVaultCommonConfig()

  console.log('Test Auth Secretkey')

  dotenv.config({path: auth_env_path, override: true})
  setCertsPath(auth_certs_path)

  secretManager = SecretManager.New()
  let data = await secretManager.getSecrets('secretkey/auth')
  console.log(data)
}

async function test_apikey_ipfs() {

  console.log('Test IPFS API KEY')

  dotenv.config({path: worker_env_path, override: true})
  setCertsPath(worker_certs_path)

  secretManager = SecretManager.New()
  const data = await secretManager.getSecrets('apikey/ipfs')
  console.log(data)
}

async function test_operator_key_guardian() {

  console.log('Test OPERATOR KEY/ID by Guardian')

  dotenv.config({path: guardian_env_path, override: true})
  setCertsPath(guardian_certs_path)

  secretManager = SecretManager.New()
  const data = await secretManager.getSecrets('keys/operator')
  console.log(data)
}

async function test_operator_key_policy() {

  console.log('Test OPERATOR KEY/ID by Policy Service')

  dotenv.config({path: policy_env_path, override: true})
  setCertsPath(policy_certs_path)

  secretManager = SecretManager.New()
  const data = await secretManager.getSecrets('keys/operator')
  console.log(data)
}

async function test_wallet_guardian() {

  console.log('Test Wallet by Guardian Service')

  dotenv.config({path: guardian_env_path, override: true})
  setCertsPath(guardian_certs_path)

  secretManager = SecretManager.New()
  await secretManager.setSecrets('wallet/test_guardian', {
    private_key: '0x1234567890abcdef',
  })

  const data = await secretManager.getSecrets('wallet/test_guardian')
  console.log(data)
}

async function test_wallet_policy() {

  console.log('Test Wallet by Policy Service')

  dotenv.config({path: policy_env_path, override: true})
  setCertsPath(policy_certs_path)

  secretManager = SecretManager.New()
  await secretManager.setSecrets('wallet/test_policy', {
    private_key: '0xABCDEF0987654321',
  })

  const data = await secretManager.getSecrets('wallet/test_policy')
  console.log(data)
}

async function test_secretmanager() {
  await test_secretkey()

  await test_apikey_ipfs()

  await test_operator_key_guardian()

  await test_operator_key_policy()

  await test_wallet_guardian()

  await test_wallet_policy()
}

test_secretmanager()