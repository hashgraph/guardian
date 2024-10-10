import { SecretManagerConfigsBase } from '../secret-manager-config-base.js';

/**
 * Interface for Azure Secret Manager configs
 */
export interface IAzureSecretManagerConfigs {
  /**
   * Azure Vault Name
   */
  vaultName: string,
}

/**
 * Class to get Azure Secret Manager configs
 */
export class AzureSecretManagerConfigs implements SecretManagerConfigsBase {
  /**
   * Get Azure Secret Manager configs from environment variables
   * @returns Azure Secret Manager configs
   * @public
   * @static
   */
  static getConfigs(): IAzureSecretManagerConfigs {
    return {
      vaultName: process.env.AZURE_VAULT_NAME,
    } as IAzureSecretManagerConfigs;
  }
}
