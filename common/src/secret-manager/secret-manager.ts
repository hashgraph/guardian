import { HcpVaultSecretManager } from './hashicorp/hcp-vault-secret-manager';
import { SecretManagerConfigs, SecretManagerType } from './secret-manager-config';
import { SecretManagerBase } from './secret-manager-base';
import { AwsSecretManager } from './aws/aws-secret-manager';
import { IHcpVaultSecretManagerConfigs } from './hashicorp/hcp-vault-secret-manager-configs';
import { IAwsSecretManagerConfigs } from './aws/aws-secret-manager-configs';
import { OldSecretManager } from './old-style/old-secret-manager';

/**
 * Class to get secret manager
 */
export class SecretManager {
  /**
   * Get default secret manager type set in environment variable SECRET_MANAGER or HCP_VAULT if not set
   * @returns default secret manager type
   */
  static defaultType(): SecretManagerType {
    const typeFromEnv = process.env.SECRET_MANAGER as SecretManagerType
    if (typeFromEnv && Object.values(SecretManagerType).includes(typeFromEnv)) {
      return typeFromEnv
    } else {
      return SecretManagerType.OLD_STYLE
    }
  }

  /**
   * Get secret manager type from default or provided type
   * @param secretManagerType optional secret manager type
   * @returns secret manager type
   * @throws Error if the secret manager type is invalid
   * @static
   */
  static getSecretManagerType(secretManagerType?: SecretManagerType): SecretManagerType {
    if (!secretManagerType) {
      secretManagerType = SecretManager.defaultType();
    }
    else if (!Object.values(SecretManagerType).includes(secretManagerType)) {
      throw new Error('Invalid Secret Manager Type')
    }

    return secretManagerType;
  }

  /**
   * Instantiate secret manager of specified type or default type
   * @param secretManagerType optional secret manager type
   * @returns Secret Manager
   */
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
      case SecretManagerType.OLD_STYLE:
        return new OldSecretManager()
      default:
        throw new Error('Invalid Secret Manager Type')
    }
  }
}
