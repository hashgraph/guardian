import { SecretManagerConfigsBase } from "../SecretManagerConfigBase";
import * as fs from "fs"
import * as path from 'path';

export interface IHcpVaultSecretManagerConfigs {
  apiVersion: string,
  endpoint: string,
  tlsOptions: IHcpVaultTlsOptions,
  approleCredential: ApproleCrential,
}

export interface ApproleCrential {
  roleId: string,
  secretId: string,
}

export interface IHcpVaultTlsOptions {
  ca: Buffer,
  cert: Buffer,
  key: Buffer,
}

export class HcpVaultSecretManagerConfigs implements SecretManagerConfigsBase {
  static getConfigs(): IHcpVaultSecretManagerConfigs {   
    return {
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
  }
}