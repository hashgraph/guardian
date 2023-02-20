import { Wallet } from './wallet';
import { SecretManagerType } from '../secret-manager';

process.env.AWS_REGION = 'eu-central-1'

async function test_wallet_by_guardian() {
  console.log('Test Wallet by Guardian')

  const wallet = new Wallet(SecretManagerType.AWS)
  await wallet.setKey('token1', 'OPERATOR', 'privateKey', '123456')
  const data = await wallet.getKey('token1', 'OPERATOR', 'privateKey')

  console.log(data);
}

async function test_wallet() {
  await test_wallet_by_guardian()
}

test_wallet()