import { IAwsSecretManagerConfigs } from './aws/aws-secret-manager-configs'
import { IHcpVaultSecretManagerConfigs } from './hashicorp/hcp-vault-secret-manager-configs'

/**
 * Interface for secret manager configs
 */
export type ISecretManagerConfigs = IHcpVaultSecretManagerConfigs | IAwsSecretManagerConfigs;

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