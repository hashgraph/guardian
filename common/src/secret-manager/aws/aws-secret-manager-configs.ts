import { SecretManagerConfigsBase } from '../secret-manager-config-base';

/**
 * Interface for AWS Secret Manager configs
 */
export interface IAwsSecretManagerConfigs {
  /**
   * AWS region
   */
  region: string,
}

/**
 * Class to get AWS Secret Manager configs
 */
export class AwsSecretManagerConfigs implements SecretManagerConfigsBase {
  /**
   * Get AWS Secret Manager configs from environment variables
   * @returns AWS Secret Manager configs
   * @public
   * @static
   */
  static getConfigs(): IAwsSecretManagerConfigs {
    return {
      region: process.env.AWS_REGION,
    } as IAwsSecretManagerConfigs;
  }
}