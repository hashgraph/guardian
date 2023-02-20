import { HcpVaultSecretManager } from './hashicorp/hcp-vault-secret-manager';
import { SecretManagerConfigs, SecretManagerType } from './secret-manager-config';
import { SecretManagerBase } from './secret-manager-base';
import { AwsSecretManager } from './aws/aws-secret-manager';
import { IHcpVaultSecretManagerConfigs } from './hashicorp/hcp-vault-secret-manager-configs';
import { IAwsSecretManagerConfigs } from './aws/aws-secret-manager-configs';

export class SecretManager {
  static defaultType(): SecretManagerType {
    const typeFromEnv = process.env.SECRET_MANAGER as SecretManagerType
    if (typeFromEnv && Object.values(SecretManagerType).includes(typeFromEnv)) {
      return typeFromEnv
    } else {
      return SecretManagerType.HCP_VAULT
    }
  }

  static getSecretManagerType(secretManagerType?: SecretManagerType): SecretManagerType {
    if (!secretManagerType) {
      secretManagerType = SecretManager.defaultType();
    }
    else if (!Object.values(SecretManagerType).includes(secretManagerType)) {
      throw new Error('Invalid Secret Manager Type')
    }

    return secretManagerType;
  }

  static New(secretManagerType?: SecretManagerType): SecretManagerBase {
    secretManagerType = SecretManager.getSecretManagerType(secretManagerType)

    const configs = SecretManagerConfigs.getConfig(secretManagerType)

    switch (secretManagerType) {
      case SecretManagerType.HCP_VAULT:
        return new HcpVaultSecretManager(configs as IHcpVaultSecretManagerConfigs)
      case SecretManagerType.AWS:
        return new AwsSecretManager(configs as IAwsSecretManagerConfigs)
      case SecretManagerType.GCP:
        return /* new GcpSecretManager(config) */
      case SecretManagerType.AZURE:
        return /* new AzureSecretManager(config) */
      default:
        throw new Error('Invalid Secret Manager Type')
    }
  }
}
