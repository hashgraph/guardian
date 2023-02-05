import { Wallet } from "./Wallet";
import * as dotenv from 'dotenv';
import * as path from 'path';

const guardian_env_path = path.join(__dirname, '../../../guardian-service/.env')
const policy_env_path = path.join(__dirname, '../../../policy-service/.env')

const guardian_certs_path = path.join(__dirname, '../../../guardian-service/tls/vault/client')
const policy_certs_path = path.join(__dirname, '../../../policy-service/tls/vault/client')

function setCertsPath(certsPath: string) {
  process.env.VAULT_CA_CERT = `${certsPath}/ca.crt`
  process.env.VAULT_CLIENT_CERT = `${certsPath}/tls.crt`
  process.env.VAULT_CLIENT_KEY = `${certsPath}/tls.key`
}

async function test_wallet_by_guardian() {
  console.log("Test Wallet by Guardian")
  
  dotenv.config({path: guardian_env_path, override: true})
  setCertsPath(guardian_certs_path)

  const wallet = new Wallet()
  await wallet.setKey("token1", "OPERATOR", "privateKey", "123456")
  const data = await wallet.getKey("token1", "OPERATOR", "privateKey")

  console.log(data);
}

async function test_wallet() {
  await test_wallet_by_guardian()
} 

test_wallet()