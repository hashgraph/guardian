import { SecretManager, SecretManagerBase, SecretManagerType } from '../secret-manager';
import crypto from 'crypto';

/**
 * Class to manage wallet by Secret Manager Resources
 */
export class Wallet {
  /**
   * Secret Manager Instance
   * @private
   */
  private readonly secretManager: SecretManagerBase;
  /**
   * Encryption algorithm
   * @private
   */
  private readonly encryptionAlg = process.env.HASHICORP_ENCRIPTION_ALG || 'sha512';

  constructor(secretManagerType?: SecretManagerType) {
    this.secretManager = SecretManager.New(secretManagerType)
  }

  /**
   * Get key from vault
   * @param token
   * @param type
   * @param key
   */
  public async getKey(token: string, type: string, key: string): Promise<string> {
    const result = await this.secretManager.getSecrets(`wallet/${this.generateKeyName(token, type, key)}`, {token, type, key, t: 'user_key'});
    return result ? result.privateKey : null;
  }

  /**
   * Set key to vault
   * @param token
   * @param type
   * @param key
   * @param value
   */
  public async setKey(token: string, type: string, key: string, value: string): Promise<void>{
    await this.secretManager.setSecrets(`wallet/${this.generateKeyName(token, type, key)}`, {
      privateKey: value,
    }, {token, type, key, value})
  }

  /**
   * Generate base64 encoded string
   * @param token
   * @param type
   * @param key
   * @private
   */
  private generateKeyName(token: string, type: string, key: string): string {
    return crypto.createHash(this.encryptionAlg).update(`${token}|${type}|${key}`).digest('hex');
  }

}
