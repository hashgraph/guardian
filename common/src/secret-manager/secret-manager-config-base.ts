import { IAwsSecretManagerConfigs } from './aws/aws-secret-manager-configs.js'
import { IAzureSecretManagerConfigs } from './azure/azure-secret-manager-configs.js';
import { IGcpSecretManagerConfigs } from './gcp/gcp-secret-manager-configs.js';
import { IHcpVaultSecretManagerConfigs } from './hashicorp/hcp-vault-secret-manager-configs.js'

/**
 * Interface for secret manager configs
 */
export type ISecretManagerConfigs = IHcpVaultSecretManagerConfigs | IAwsSecretManagerConfigs | IAzureSecretManagerConfigs | IGcpSecretManagerConfigs;

/**
 * Base class for secret manager configs
 * @abstract
 */
export abstract class SecretManagerConfigsBase {
  /**
   * Get secret manager configs
   * @returns secret manager configs
   */
  static getConfigs(): ISecretManagerConfigs {
    return
  }
}
