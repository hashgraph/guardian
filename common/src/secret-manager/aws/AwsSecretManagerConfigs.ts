import { SecretManagerConfigsBase } from "../SecretManagerConfigBase";

export interface IAwsSecretManagerConfigs {
  region: string,
}

export class AwsSecretManagerConfigs implements SecretManagerConfigsBase {
  static getConfigs(): IAwsSecretManagerConfigs {   
    return {
      region: process.env.AWS_REGION,
    } as IAwsSecretManagerConfigs;
  }
}