import { AwsSecretManager } from './aws/aws-secret-manager';
import { SecretManager } from './secret-manager';
import { SecretManagerType } from './secret-manager-config';

process.env.AWS_REGION = 'eu-central-1';

/**
 * Test AWS Secret Manager
 * @async
 * @function
 */
async function test_aws_secretmanager() {
  const secretManager = SecretManager.New(SecretManagerType.AWS) as AwsSecretManager

  await secretManager.setSecrets('apikey/ipfs', {
    IPFS_STORAGE_API_KEY: process.env.IPFS_STORAGE_API_KEY
  })

  // const { IPFS_STORAGE_API_KEY } = await secretManager.getSecrets('apikey/ipfs')

  await secretManager.setSecrets('secretkey/auth', {
    ACCESS_TOKEN_SECRET: 'weakpassword'
  })

  // const { ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth')

  await secretManager.setSecrets('keys/operator', {
    OPERATOR_ID: process.env.OPERATOR_ID,
    OPERATOR_KEY: process.env.OPERATOR_KEY
  })

  // const { OPERATOR_ID, OPERATOR_KEY } = await secretManager.getSecrets('keys/operator')

  await secretManager.setSecrets('wallet/123', {
    privateKey: 'abcdef0987654321'
  })
  // const { privateKey } = await secretManager.getSecrets('wallet/123')
}

test_aws_secretmanager()
