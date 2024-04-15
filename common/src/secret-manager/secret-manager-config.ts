import { AwsSecretManagerConfigs } from './aws/aws-secret-manager-configs.js'
import { AzureSecretManagerConfigs } from './azure/azure-secret-manager-configs.js'
import { GcpSecretManagerConfigs } from './gcp/gcp-secret-manager-configs.js'
import { HcpVaultSecretManagerConfigs } from './hashicorp/hcp-vault-secret-manager-configs.js'
import { ISecretManagerConfigs } from './secret-manager-config-base.js'

/**
 * Enum for secret manager types
 */
export enum SecretManagerType {
  /**
   * Hashicorp Vault
   */
  HCP_VAULT = 'hcp',
  /**
   * AWS Secret Manager
   */
  AWS = 'aws',
  /**
   * Google Secret Manager
   */
  GCP = 'gcp',
  /**
   * Azure Secrets Manager
   */
  AZURE = 'azure',
  /**
   * Old style secrets
   */
  OLD_STYLE = 'oldstyle'
}

/**
 * Class to get secret manager configs
 */
export class SecretManagerConfigs {
  /**
   * Get secret manager configs
   * @param secretmanagerType secret manager type
   * @returns secret manager configs
   * @public
   * @static
   * @throws Error if the secret manager type is invalid
   */
  static getConfig(secretmanagerType: SecretManagerType): ISecretManagerConfigs {
    switch (secretmanagerType) {
      case SecretManagerType.HCP_VAULT:
        return HcpVaultSecretManagerConfigs.getConfigs()
      case SecretManagerType.AWS:
        return AwsSecretManagerConfigs.getConfigs()
      case SecretManagerType.GCP:
        return GcpSecretManagerConfigs.getConfigs()
      case SecretManagerType.AZURE:
        return AzureSecretManagerConfigs.getConfigs()
      case SecretManagerType.OLD_STYLE:
        return
      default:
        throw new Error('Invalid Secret Manager Type')
    }
  }
}
