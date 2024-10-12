import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { SecretManagerBase } from '../secret-manager-base.js';
import { IAzureSecretManagerConfigs } from './azure-secret-manager-configs.js';

/**
 * This class is responsible for managing secrets in Azure Secret Manager
 * It implements the SecretManagerBase interface
 */
export class AzureSecretManager implements SecretManagerBase {
  /**
   * The client is responsible for communicating with Azure Secret Manager
   * @private
   */
  private readonly client: SecretClient;

  /**
   * The base path for all secrets
   * @private
   */
  private readonly baseSecretPath = 'guardian/';

  constructor(configs: IAzureSecretManagerConfigs) {
    const url = `https://${configs.vaultName}.vault.azure.net`;

    const credential = new DefaultAzureCredential();
    this.client = new SecretClient(url, credential);
  }

  /**
   * Construct the secret id from the base path and the path
   * SecretId is converted into PascalCase format as
   * Azure Secret Manager does not allow hyphens in secret names
   * @param path secret path
   * @returns secret id
   * @async
   * @public
   */
  private getSecretId(path: string): string {
    // let secretPath = this.baseSecretPath + path;
    // MultiEnv
    const secretPath = (process.env.GUARDIAN_ENV)?
              this.baseSecretPath + `${process.env.GUARDIAN_ENV}/${process.env.HEDERA_NET}/` + path:
              this.baseSecretPath + `${process.env.HEDERA_NET}/` + path;

    // convert path string to PascalCase format (Azure Secret Manager does not allow hyphens in secret names)
    const parts = secretPath.split('/');
    const secretId = parts.map((part, _) => part.charAt(0).toUpperCase() + part.slice(1));
    console.log('*** > azure secretId',secretId.join(''));
    return secretId.join('');
  }

  /**
   * verify if the secret exists
   * @param path secret path
   * @returns true if the secret exists, false otherwise
   * @throws Error if any other error occurs
   * @async
   * @public
   */
  public async existsSecrets(path: string): Promise<boolean> {
    try {
      await this.client.getSecret(this.getSecretId(path));
      console.log('*** > azure existsSecrets TRUE');
      return true;
    } catch (ex) {
      if (ex.details.error.code === 'SecretNotFound') {
        return false;
      } else {
        throw ex;
      }
    }
  }

  /**
   * Get the secret
   * @param path secret path
   * @returns secret data
   * @throws ResourceNotFoundException if the secret does not exist
   * @throws Error if any other error occurs
   * @async
   * @public
   */
  public async getSecrets(path: string): Promise<any> {
    try {
      const { value } = await this.client.getSecret(this.getSecretId(path));
      console.log('*** > azure getSecrets value', JSON.parse(value));
      return JSON.parse(value);
    } catch (ex) {
      if (ex.details && ex.details.error.code === 'SecretNotFound') {
        return null;
      } else {
        throw ex;
      }
    }
  }

  /**
   * Update secret if not exists, otherwise Create it
   * @param path secret path
   * @param data secret data
   * @throws Error if any error occurs
   * @returns void
   * @async
   * @public
   */
  public async setSecrets(path: string, data: any): Promise<void> {
    try {
      await this.client.setSecret(this.getSecretId(path), JSON.stringify(data));
      console.log('*** > azure setSecrets');
    } catch (ex) {
      throw ex;
    }
  }

  /**
   * Create the secret
   * @param path secret path
   * @param data secret data
   * @throws Error if any error occurs
   * @returns void
   * @async
   * @prublic
   */
  public async createSecrets(path: string, data: any): Promise<void> {
    await this.setSecrets(path, data);
  }
}
