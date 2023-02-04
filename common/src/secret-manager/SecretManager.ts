import { SecretManagerType } from "./SecretManagerConfig";

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
      secretManagerType = this.defaultType();
    }
    else if (!Object.values(SecretManagerType).includes(secretManagerType)) {
      throw new Error("Invalid Secret Manager Type")
    }

    return secretManagerType;
  }

}
