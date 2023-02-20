import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { SecretManagerBase } from '../secret-manager-base';
import { IAwsSecretManagerConfigs } from './aws-secret-manager-configs';

export class AwsSecretManager implements SecretManagerBase {
  private readonly client: SecretsManagerClient;
  private readonly baseSecretPath = 'guardian/';

  constructor(configs: IAwsSecretManagerConfigs) {
    this.client = new SecretsManagerClient({
      region: configs.region,
    });
  }

  private getSecretId(path: string): string {
    return this.baseSecretPath + path;
  }

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

  async setSecrets(path: string, data: any): Promise<any> {
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