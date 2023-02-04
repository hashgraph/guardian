import NodeVault from "node-vault"
import { SecretManager } from "../SecretManager";
import { ApproleCrential, IHcpVaultSecretManagerConfigs } from "./HcpVaultSecretManagerConfigs";

export class HcpVaultSecretManager implements SecretManager {
  private approle: ApproleCrential;
  private vault: NodeVault.client;

  constructor(config: IHcpVaultSecretManagerConfigs) {
    this.approle = config.approleCredential  

    this.vault = NodeVault({
      apiVersion: config.apiVersion,
      endpoint: config.endpoint,
      requestOptions: config.tlsOptions
    } as NodeVault.Option);
  }

  async getSecrets(path: string): Promise<any> {
    return
  }

  async setSecrets(path: string, data: any): Promise<any> {
    return
  }
}