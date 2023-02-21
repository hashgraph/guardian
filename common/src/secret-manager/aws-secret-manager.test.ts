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
    IPFS_STORAGE_API_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweGM2YzJlMzg2YkU0QzBlRGY5MEMwZjE2MjIxRmYyMTgxMjY1OEQyYTUiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NjY2MDM3Njc2MTMsIm5hbWUiOiJHdWFyZGlhbiBUZXN0In0.qw0O9fdFSXsrFWm5Wk75OdayKq5tSCg0_iB4c0Ixd7J'
  })

  const { IPFS_STORAGE_API_KEY } = await secretManager.getSecrets('apikey/ipfs')
  console.log(IPFS_STORAGE_API_KEY);

  await secretManager.setSecrets('secretkey/auth', {
    ACCESS_TOKEN_SECRET: 'weakpassword'
  })

  const { ACCESS_TOKEN_SECRET } = await secretManager.getSecrets('secretkey/auth')
  console.log(ACCESS_TOKEN_SECRET);

  await secretManager.setSecrets('keys/operator', {
    OPERATOR_ID: '0.0.12345678',
    OPERATOR_KEY: '0x1276237349870385464852193749'
  })

  const { OPERATOR_ID, OPERATOR_KEY } = await secretManager.getSecrets('keys/operator')
  console.log(OPERATOR_ID, OPERATOR_KEY);

  await secretManager.setSecrets('wallet/123', {
    privateKey: 'abcdef0987654321'
  })
  const { privateKey } = await secretManager.getSecrets('wallet/123')
  console.log(privateKey);
}

test_aws_secretmanager()