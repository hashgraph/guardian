import NodeVault from 'node-vault'
import { SecretManagerBase } from '../secret-manager-base';
import { ApproleCrential, IHcpVaultSecretManagerConfigs } from './hcp-vault-secret-manager-configs';

export class HcpVaultSecretManager implements SecretManagerBase {
  private readonly approle: ApproleCrential;
  private readonly vault: NodeVault.client;

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
    await this.loginByApprole()
    try {
      const result = await this.vault.read(this.getSecretId(path))
      return result.data.data
    } catch(ex) {
      if(ex.response.statusCode === 404) {
        return null;
      }
      throw Error('Retreive Secret Failed: ' + ex)
    }
  }

  async setSecrets(path: string, data: any): Promise<any> {
    await this.loginByApprole()
    try {
      await this.vault.write(this.getSecretId(path), { data })
    } catch(ex) {
      throw new Error('Write Secrets Failed: ' + ex)
    }
  }

  private getSecretId(path: string): string {
    return `secret/data/${path}`;
  }
}