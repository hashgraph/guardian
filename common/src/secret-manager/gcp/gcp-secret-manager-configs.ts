import { SecretManagerConfigsBase } from '../secret-manager-config-base.js';

/**
 * Interface for GCP Secret Manager configs
 */
export interface IGcpSecretManagerConfigs {
  /**
   * GCP region
   */
  projectId: string,
}

/**
 * Class to get GCP Secret Manager configs
 */
export class GcpSecretManagerConfigs implements SecretManagerConfigsBase {
  /**
   * Get GCP Secret Manager configs from environment variables
   * @returns GCP Secret Manager configs
   * @public
   * @static
   */
  static getConfigs(): IGcpSecretManagerConfigs {
    return {
      projectId: process.env.GCP_PROJECT_ID,
    } as IGcpSecretManagerConfigs;
  }
}
