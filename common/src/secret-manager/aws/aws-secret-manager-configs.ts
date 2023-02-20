import { SecretManagerConfigsBase } from '../secret-manager-config-base';

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