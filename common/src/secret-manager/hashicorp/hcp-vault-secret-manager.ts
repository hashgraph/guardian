import NodeVault from 'node-vault'
import { SecretManagerBase } from '../secret-manager-base';
import { ApproleCrential, IHcpVaultSecretManagerConfigs } from './hcp-vault-secret-manager-configs';

/**
 * This class is responsible for managing secrets in Hashicorp Vault
 * It implements the SecretManagerBase interface
 */
export class HcpVaultSecretManager implements SecretManagerBase {
  /**
   * Approle credential
   * @private
   */
  private readonly approle: ApproleCrential;

  /**
   * The client is responsible for communicating with Hashicorp Vault
   * @private
   */
  private readonly vault: NodeVault.client;

  constructor(config: IHcpVaultSecretManagerConfigs) {
    this.approle = config.approleCredential

    this.vault = NodeVault({
      apiVersion: config.apiVersion,
      endpoint: config.endpoint,
      requestOptions: config.tlsOptions
    } as NodeVault.Option);
  }

  /**
   * Login to Vault by Approle
   * @private
   * @async
   * @returns void
   * @throws Error if any error occurs
   */
  private async loginByApprole(): Promise<void> {
    const result = await this.vault.approleLogin({
      role_id: this.approle.roleId,
      secret_id: this.approle.secretId,
    })

    this.vault.token = result.auth.client_token;
  }

  /**
   * Get secrets from Vault
   * @param path secret path
   * @returns secret data
   * @returns null if the secret does not exist
   * @throws Error if any error occurs
   * @async
   * @public
   */
  async getSecrets(path: string): Promise<any> {
    await this.loginByApprole()
    try {
      const result = await this.vault.read(this.getSecretId(path))
      return result.data.data
    } catch(ex) {
      if(ex.response.statusCode === 404) {
        return null;
      }
      throw Error('Retreive Secret Failed: ' + ex)
    }
  }

  /**
   * Update secrets in Vault
   * @param path secret path
   * @param data secret data
   * @returns void
   * @throws Error if any error occurs
   * @async
   * @public
   */
  async setSecrets(path: string, data: any): Promise<void> {
    await this.loginByApprole()
    try {
      await this.vault.write(this.getSecretId(path), { data })
    } catch(ex) {
      throw new Error('Write Secrets Failed: ' + ex)
    }
  }

  /**
   * Get secret id from the base path and the path
   * @param path secret path
   * @returns secret id
   * @private
   */
  private getSecretId(path: string): string {
    return `secret/data/${path}`;
  }
}