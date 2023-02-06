import { IAwsSecretManagerConfigs } from './aws/AwsSecretManagerConfigs'
import { IHcpVaultSecretManagerConfigs } from './hashicorp/HcpVaultSecretManagerConfigs'

export type ISecretManagerConfigs = IHcpVaultSecretManagerConfigs | IAwsSecretManagerConfigs;

export abstract class SecretManagerConfigsBase {
  static getConfigs(): ISecretManagerConfigs {
    return
  }
}