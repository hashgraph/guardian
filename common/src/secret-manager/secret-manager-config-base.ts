import { IAwsSecretManagerConfigs } from './aws/aws-secret-manager-configs'
import { IHcpVaultSecretManagerConfigs } from './hashicorp/hcp-vault-secret-manager-configs'

export type ISecretManagerConfigs = IHcpVaultSecretManagerConfigs | IAwsSecretManagerConfigs;

export abstract class SecretManagerConfigsBase {
  static getConfigs(): ISecretManagerConfigs {
    return
  }
}