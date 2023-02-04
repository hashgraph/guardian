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

  private async loginByApprole(): Promise<void> {
    const result = await this.vault.approleLogin({
      role_id: this.approle.roleId,
      secret_id: this.approle.secretId,
    })

    this.vault.token = result.auth.client_token;
  }

  async getSecrets(path: string): Promise<any> {
    return
  }

  async setSecrets(path: string, data: any): Promise<any> {
    return
  }
}