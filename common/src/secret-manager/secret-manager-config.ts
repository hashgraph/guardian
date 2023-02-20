import { AwsSecretManagerConfigs } from './aws/aws-secret-manager-configs'
import { HcpVaultSecretManagerConfigs } from './hashicorp/hcp-vault-secret-manager-configs'
import { ISecretManagerConfigs } from './secret-manager-config-base'

export enum SecretManagerType {
  HCP_VAULT = 'hcp',
  AWS = 'aws',
  GCP = 'gcp',
  AZURE = 'azure'
}

export class SecretManagerConfigs {
  static getConfig(secretmanagerType: SecretManagerType): ISecretManagerConfigs {
    switch (secretmanagerType) {
      case SecretManagerType.HCP_VAULT:
        return HcpVaultSecretManagerConfigs.getConfigs()
      case SecretManagerType.AWS:
        return AwsSecretManagerConfigs.getConfigs()
      case SecretManagerType.GCP:
        return /* GoogleSecretManagerConfigs.getConfigs() */
      case SecretManagerType.AZURE:
        return /* AzureSecretsManagerConfig.getConfigs() */
      default:
        throw new Error('Invalid Secret Manager Type')
    }
  }
}