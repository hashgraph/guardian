import { HcpVaultSecretManagerConfigs } from "./hashicorp/HcpVaultSecretManagerConfigs"
import { ISecretManagerConfigs } from "./SecretManagerConfigBase"

export enum SecretManagerType {
  HCP_VAULT = "hcp",
  AWS = "aws",
  GCP = "gcp",
  AZURE = "azure"
}

export class SecretManagerConfigs {
  static getConfig(secretmanagerType: SecretManagerType): ISecretManagerConfigs {
    switch (secretmanagerType) {
      case SecretManagerType.HCP_VAULT:
        return HcpVaultSecretManagerConfigs.getConfigs()
      case SecretManagerType.AWS:
        return /* AwsSecretsManagerConfig.getConfigs() */
      case SecretManagerType.GCP:
        return /* GoogleSecretManagerConfigs.getConfigs() */
      case SecretManagerType.AZURE:
        return /* AzureSecretsManagerConfig.getConfigs() */
      default:
        throw new Error("Invalid Secret Manager Type")
    }
  }
}