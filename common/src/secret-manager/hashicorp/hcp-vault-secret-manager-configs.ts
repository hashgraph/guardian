import { SecretManagerConfigsBase } from '../secret-manager-config-base.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Interface for HCP Vault configs
 */
export interface IHcpVaultSecretManagerConfigs {
  /**
   * Vault API version
   */
  apiVersion: string,

  /**
   * Vault endpoint
   */
  endpoint: string,

  /**
   * Vault TLS options
   * @see https://www.vaultproject.io/docs/commands#vault_tls_client_cert
   */
  tlsOptions: IHcpVaultTlsOptions,

  /**
   * Vault Approle credential
   * @see https://www.vaultproject.io/docs/auth/approle
   */
  approleCredential: ApproleCrential,
}

/**
 * Interface for Vault Approle credential
 * @see https://www.vaultproject.io/docs/auth/approle
 */
export interface ApproleCrential {
  /**
   * Role id
   * @see https://www.vaultproject.io/docs/auth/approle#role-id
   */
  roleId: string,
  /**
   * Secret id
   * @see https://www.vaultproject.io/docs/auth/approle#secret-id
   */
  secretId: string,
}

/**
 * Interface for Vault TLS options
 */
export interface IHcpVaultTlsOptions {
  /**
   * Certificate authority
   */
  ca: Buffer,
  /**
   * Client certificate
   */
  cert: Buffer,
  /**
   * Client key
   */
  key: Buffer,
}

/**
 * Class to handle HCP Vault configs
 */
export class HcpVaultSecretManagerConfigs implements SecretManagerConfigsBase {
  /**
   * Get HCP Vault configs from environment variables
   * @returns HCP Vault configs
   * @static
   */
  static getConfigs(): IHcpVaultSecretManagerConfigs {
    const conf = {
      apiVersion: process.env.VAULT_API_VERSION,
      endpoint: process.env.VAULT_ADDRESS,
      tlsOptions: {
        ca: fs.readFileSync(
          path.join(process.cwd(), process.env.VAULT_CA_CERT)),
        cert: fs.readFileSync(
          path.join(process.cwd(), process.env.VAULT_CLIENT_CERT)),
        key: fs.readFileSync(
          path.join(process.cwd(), process.env.VAULT_CLIENT_KEY)),
      },
      approleCredential: {
        roleId: process.env.VAULT_APPROLE_ROLE_ID,
        secretId: process.env.VAULT_APPROLE_SECRET_ID,
      }
    } as IHcpVaultSecretManagerConfigs;
    return conf;
  }
}
