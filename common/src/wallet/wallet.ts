import { SecretManager, SecretManagerBase, SecretManagerType } from '../secret-manager/index.js';
import crypto from 'node:crypto';
import { Hashing } from '../hedera-modules/hashing.js';
import { AzureSecretManager } from '../secret-manager/azure/azure-secret-manager.js';
import { GcpSecretManager } from '../secret-manager/gcp/gcp-secret-manager.js';

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
        const result = await this.secretManager.getSecrets(`wallet/${this.generateKeyName(token, type, key)}`, { token, type, key, t: 'user_key' });
        return result ? result.privateKey : null;
    }

    /**
     * Set key to vault
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setKey(token: string, type: string, key: string, value: string): Promise<void> {
        await this.secretManager.setSecrets(`wallet/${this.generateKeyName(token, type, key)}`, {
            privateKey: value,
        }, { token, type, key, value })
    }

    /**
     * Generate base64 encoded string
     * @param token
     * @param type
     * @param key
     * @private
     */
    private generateKeyName(token: string, type: string, key: string): string {
        const hashedKey = crypto.createHash(this.encryptionAlg).update(`${token}|${type}|${key}`).digest('hex');

        if (!(this.secretManager instanceof AzureSecretManager) && !(this.secretManager instanceof GcpSecretManager)) {
            return hashedKey;
        }

        // convert hashedKey from hex to Base58 to shoeten key length, Azure does not accept keys longet than 128 chars
        // convert hashedKey from hex to Base58 to shoeten key length, GCP does not accept keys longet than 255 chars
        const buffer = Buffer.from(hashedKey, 'hex');
        const hashedKeyBase58 = Hashing.base58.encode(buffer);
        return hashedKeyBase58;
    }

}
