import NodeVault from 'node-vault';
import { IVault } from './vault.interface';
import assert from 'assert';
import crypto from 'crypto';

/**
 * HashiCorp vault helper
 */
export class HashicorpVault implements IVault{
    /**
     * Vault options
     * @private
     */
    private readonly options: NodeVault.VaultOptions = {
        apiVersion: 'v1',
        endpoint: process.env.HASHICORP_ADDRESS,
        token: process.env.HASHICORP_TOKEN,
    }

    /**
     * Vault client instance
     * @private
     */
    private readonly vault: NodeVault.client;

    constructor() {
        assert(process.env.HASHICORP_ADDRESS, 'HASHICORP_ADDRESS environment variable is not set');
        assert(process.env.HASHICORP_TOKEN, 'HASHICORP_TOKEN environment variable is not set');

        this.vault = NodeVault(this.options);
    }

    /**
     * Generate base64 encoded string
     * @param token
     * @param type
     * @param key
     * @private
     */
    private generateKeyName(token: string, type: string, key: string): string {
        return crypto.createHash('sha512').update(`${token}|${type}|${key}`).digest('hex');
    }

    /**
     * Init vault
     * @private
     */
    public async init(): Promise<IVault> {
        const {initialized} = await this.vault.initialized();
        if (!initialized) {
            await this.vault.init({ secret_shares: 1, secret_threshold: 1 });
        }

        return this;
    }

    /**
     * Get key from vault
     * @param token
     * @param type
     * @param key
     */
    public async getKey(token: string, type: string, key: string): Promise<any> {
        const result = await this.vault.read(`secret/data/${this.generateKeyName(token, type, key)}`);
        return result.data.data.privateKey;
    }

    /**
     * Set key to vault
     * @param token
     * @param type
     * @param key
     * @param value
     */
    public async setKey(token: string, type: string, key: string, value: string): Promise<void>{
        await this.vault.write(`secret/data/${this.generateKeyName(token, type, key)}`, {
            data: {
                privateKey: value
            }
        })
    }
}
