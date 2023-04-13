import { Wallet } from './wallet';
import * as dotenv from 'dotenv';
import * as path from 'path';

const guardianEnvPath = path.join(process.cwd(), '../guardian-service/.env')

const guardianCertsPath = path.join('../guardian-service/tls/vault/client')

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
 * Test read/write wallet to Hashicorp Vault by Guardian Service
 */
async function test_wallet_by_guardian() {
  console.log('Test Wallet by Guardian')

  dotenv.config({path: guardianEnvPath, override: true})
  setCertsPath(guardianCertsPath)

  const wallet = new Wallet()
  await wallet.setKey('token1', 'OPERATOR', 'privateKey', '123456')
  const data = await wallet.getKey('token1', 'OPERATOR', 'privateKey')

  console.log(data);
}

/**
 * Test read/write wallet to Hashicorp Vault
 */
async function test_wallet() {
  await test_wallet_by_guardian()
}

test_wallet()