import { IHcpVaultSecretManagerConfigs } from './hashicorp/HcpVaultSecretManagerConfigs'

export type ISecretManagerConfigs = IHcpVaultSecretManagerConfigs

export abstract class SecretManagerConfigsBase {
  static getConfigs(): ISecretManagerConfigs {
    return
  }
}