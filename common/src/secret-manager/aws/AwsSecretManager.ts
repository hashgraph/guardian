import { SecretsManagerClient, GetSecretValueCommand, UpdateSecretCommand } from "@aws-sdk/client-secrets-manager";
import { SecretManagerBase } from "../SecretManagerBase";
import { IAwsSecretManagerConfigs } from "./AwsSecretManagerConfigs";

export class AwsSecretManager implements SecretManagerBase {
  private client: SecretsManagerClient;
  private baseSecretPath = 'guardian/';

  constructor(configs: IAwsSecretManagerConfigs) {
    this.client = new SecretsManagerClient({
      region: configs.region,
    });
  }

  private getSecretId(path: string): string {
    return this.baseSecretPath + path;
  }

  public async getSecrets(path: string): Promise<any> {  
    try {
      const response = await this.client.send(
        new GetSecretValueCommand({
          SecretId: this.getSecretId(path),
          VersionStage: "AWSCURRENT",
        })
      );
      return response.SecretString;
    } catch (ex) {
      throw new Error("Retreive Secret Failed: " + ex);
    }
  }

  async setSecrets(path: string, data: any): Promise<any> {
    try {
      await this.client.send(
        new UpdateSecretCommand({
          SecretId: this.getSecretId(path),
          SecretString: JSON.stringify(data)
        })
      );
    } catch (ex) {
      throw new Error("Write Secrets Failed: " + ex);
    }
  }
}