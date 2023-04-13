import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { SecretManagerBase } from '../secret-manager-base';
import { IAwsSecretManagerConfigs } from './aws-secret-manager-configs';

/**
 * This class is responsible for managing secrets in AWS Secret Manager
 * It implements the SecretManagerBase interface
 */
export class AwsSecretManager implements SecretManagerBase {
  /**
   * The client is responsible for communicating with AWS Secret Manager
   * @private
   */
  private readonly client: SecretsManagerClient;

  /**
   * The base path for all secrets
   * @private
   */
  private readonly baseSecretPath = 'guardian/';

  constructor(configs: IAwsSecretManagerConfigs) {
    this.client = new SecretsManagerClient({
      region: configs.region,
    });
  }

  /**
   * Construct the secret id from the base path and the path
   * @param path secret path
   * @returns secret id
   * @async
   * @public
   */
  private getSecretId(path: string): string {
    return this.baseSecretPath + path;
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
      await this.client.send(
        new GetSecretValueCommand({
          SecretId: this.getSecretId(path),
          VersionStage: 'AWSCURRENT',
        })
      );

      return true;
    } catch (ex) {
      if (ex.name === 'ResourceNotFoundException') {
        return false;
      }
      throw ex;
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
      const response = await this.client.send(
        new GetSecretValueCommand({
          SecretId: this.getSecretId(path),
          VersionStage: 'AWSCURRENT',
        })
      );
      return JSON.parse(response.SecretString);
    } catch (ex) {
      if (ex.name === 'ResourceNotFoundException') {
        return null;
      }
      throw ex;
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
  async setSecrets(path: string, data: any): Promise<void> {
    try {
      if (await this.existsSecrets(path)) {
        await this.client.send(
          new UpdateSecretCommand({
            SecretId: this.getSecretId(path),
            SecretString: JSON.stringify(data)
          })
        );
      } else {
        await this.createSecrets(path, data);
      }
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
  public async createSecrets(path: string, data: any) {
    try {
      await this.client.send(
        new CreateSecretCommand({
          Name: this.getSecretId(path),
          SecretString: JSON.stringify(data)
        })
      );
    } catch (ex) {
      throw ex;
    }
  }
}