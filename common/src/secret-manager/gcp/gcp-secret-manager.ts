import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { SecretManagerBase } from '../secret-manager-base';
import { IGcpSecretManagerConfigs } from './gcp-secret-manager-configs';

/**
 * This class is responsible for managing secrets in AWS Secret Manager
 * It implements the SecretManagerBase interface
 */
export class GcpSecretManager implements SecretManagerBase {
  /**
   * The client is responsible for communicating with AWS Secret Manager
   * @private
   */
  private readonly client: SecretManagerServiceClient;

  private readonly config: IGcpSecretManagerConfigs;

  /**
   * The base path for all secrets
   * @private
   */
  private readonly baseSecretPath = 'guardian/';

  constructor(configs: IGcpSecretManagerConfigs) {
    this.config = configs;
    this.client = new SecretManagerServiceClient();
  }

  /**
   * Construct the secret id from the base path and the path
   * @param path secret path
   * @returns secret id
   * @async
   * @public
   */
  private getSecretId(path: string): string {
    const secretPath = this.baseSecretPath + path;

    // convert path string to PascalCase format (GCP Secret Manager does not allow hyphens in secret names)
    const parts = secretPath.split('/');
    const secretId = parts.map((part, _) => part.charAt(0).toUpperCase() + part.slice(1));

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
      const name = `projects/${this.config.projectId}/secrets/${this.getSecretId(path)}/versions/latest`;
      await this.client.accessSecretVersion({name});
      return true;
    } catch (ex) {
      if (ex.details.includes('not found')) {
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
      const name = `projects/${this.config.projectId}/secrets/${this.getSecretId(path)}/versions/latest`;

      const [version] = await this.client.accessSecretVersion({name});
      const payload = version.payload.data.toString();

      return JSON.parse(payload);
    } catch (ex) {
      if (ex.details.includes('not found')) {
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
      const secretId = this.getSecretId(path);
      if (await this.existsSecrets(path)) {
        const name = `projects/${this.config.projectId}/secrets/${secretId}`;
        await this.client.addSecretVersion({
          parent: name,
          payload: {
            data: Buffer.from(JSON.stringify(data)),
          },
        });
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
      const secretId = this.getSecretId(path);
      const parent = `projects/${this.config.projectId}`;
      await this.client.createSecret({ parent, secretId, secret: {
        replication: {
          automatic: {},
        },
      }});
      return await this.client.addSecretVersion({
        parent: `${parent}/secrets/${secretId}`,
        payload: {
          data: Buffer.from(JSON.stringify(data)),
        }
      });
    } catch (ex) {
      throw ex;
    }
  }
}